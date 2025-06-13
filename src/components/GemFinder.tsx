import { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import type {
  QuestRewardsData,
  QuestReward,
  CharacterClass,
} from "../types/questRewards";
import "../styles/GemFinder.css";

const CHARACTER_CLASSES: { value: CharacterClass; label: string }[] = [
  { value: "witch", label: "Witch" },
  { value: "shadow", label: "Shadow" },
  { value: "ranger", label: "Ranger" },
  { value: "duelist", label: "Duelist" },
  { value: "marauder", label: "Marauder" },
  { value: "templar", label: "Templar" },
  { value: "scion", label: "Scion" },
];

// Lista de quests a serem removidas das quest rewards
const REMOVED_QUEST_REWARDS = [
  "Mercy Mission",
  "The Marooned Mariner",
  "The Dweller of the Deep",
  "A Dirty Job",
  "The Way Forward",
  "The Great White Beast",
  "Through Sacred Ground",
  "Lost in Love",
  "Victario's Secrets",
  "A Swig of Hope",
  "The Ribbon Spool",
  "Fiery Dust",
  "Piety's Pets",
  "An Indomitable Spirit",
  "Return to Oriath",
  "The Key to Freedom",
  "In Service to Science",
  "Death to Purity",
  "The King's Feast",
  "Kitava's Torments",
  "Essence of Umbra",
  "The Father of War",
  "Fallen from Grace",
  "Bestel's Epic",
  "The Puppet Mistress",
  "The Cloven One",
  "The Master of a Million Faces",
  "Essence of the Artist",
  "Web of Secrets",
  "The Silver Locket",
  "Kishara's Star",
  "In Memory of Greust",
  "Queen of Despair",
  "Essence of the Hag",
  "Reflection of Terror",
  "The Wings of Vastiri",
  "Love is Dead",
  "The Gemling Legion",
  "The Ruler of Highgate",
  "The Storm Blade",
  "Fastis Fortuna",
  "Queen of the Sands",
  "Safe Passage",
  "Death and Rebirth",
  "An End to Hunger",
  "No Love for Old Ghosts",
  "Map to Tsoatha",
  "Vilenta's Vengeance",
];

export function GemFinder() {
  const [questRewards, setQuestRewards] = useState<QuestRewardsData | null>(
    null
  );
  const [selectedClass, setSelectedClass] = useState<CharacterClass | "">("");
  const [selectedGems, setSelectedGems] = useState<
    { label: string; value: string }[]
  >([]);
  const [results, setResults] = useState<{
    quests: QuestReward[];
    vendors: QuestReward[];
  }>({ quests: [], vendors: [] });
  const [showResults, setShowResults] = useState(false);
  const [hideSiosa, setHideSiosa] = useState(false);
  const [hideLilly, setHideLilly] = useState(false);
  const [onlyVendors, setOnlyVendors] = useState(false);
  const [onlyRewards, setOnlyRewards] = useState(false);

  useEffect(() => {
    fetch("/questRewards.json")
      .then((response) => response.json())
      .then((data: QuestRewardsData) => setQuestRewards(data))
      .catch((error) => console.error("Erro ao carregar dados:", error));
  }, []);

  function isCharacterClass(value: string): value is CharacterClass {
    return [
      "witch",
      "shadow",
      "ranger",
      "duelist",
      "marauder",
      "templar",
      "scion",
    ].includes(value);
  }

  // Lista de todas as gemas únicas do jogo, removendo as rewards das quests bloqueadas
  const allGems = useMemo(() => {
    if (!questRewards) return [];
    const gemsSet = new Set<string>();
    const classKeys = [
      "witch",
      "shadow",
      "ranger",
      "duelist",
      "marauder",
      "templar",
      "scion",
    ];
    const addGems = (
      rewards: QuestReward[],
      filterQuestNames: string[] = []
    ) => {
      rewards.forEach((reward: QuestReward) => {
        if (
          filterQuestNames.length > 0 &&
          filterQuestNames.includes(reward.quest)
        )
          return;
        classKeys.forEach((key) => {
          const gems = reward[key as keyof QuestReward];
          if (Array.isArray(gems)) {
            (gems as string[]).forEach((gem: string) => gemsSet.add(gem));
          }
        });
      });
    };
    addGems(questRewards.reward, REMOVED_QUEST_REWARDS);
    addGems(questRewards.vendor);
    return Array.from(gemsSet).sort((a, b) => a.localeCompare(b));
  }, [questRewards]);

  const gemOptions = selectedClass
    ? allGems.map((gem) => ({ value: gem, label: gem }))
    : [];

  useEffect(() => {
    if (!questRewards || !selectedClass || selectedGems.length === 0) {
      setResults({ quests: [], vendors: [] });
      setShowResults(true);
      return;
    }
    const gems = selectedGems.map((g) => g.value.toLowerCase());
    const findGemsInRewards = (rewards: QuestReward[]) => {
      return rewards.filter((reward) => {
        const classGems = isCharacterClass(selectedClass)
          ? reward[selectedClass].map((gem: string) => gem.toLowerCase())
          : [];
        return gems.some((searchGem) =>
          classGems.some((classGem) => classGem.includes(searchGem))
        );
      });
    };
    setResults({
      quests: findGemsInRewards(questRewards.reward),
      vendors: findGemsInRewards(questRewards.vendor),
    });
    setShowResults(true);
  }, [
    questRewards,
    selectedClass,
    selectedGems,
    hideSiosa,
    hideLilly,
    onlyVendors,
    onlyRewards,
  ]);

  // Função utilitária para gerar linhas agrupadas por gema
  function getGemAcquisitionRows(
    selectedGems: { value: string; label: string }[],
    selectedClass: CharacterClass | "",
    quests: QuestReward[],
    vendors: QuestReward[]
  ) {
    if (!isCharacterClass(selectedClass)) return [];
    return selectedGems.map((gemObj) => {
      const gem = gemObj.value;
      // Quests onde a gema é recompensa (removendo as da lista)
      const questRewards = quests
        .filter(
          (q: QuestReward) =>
            isCharacterClass(selectedClass) &&
            q[selectedClass].some(
              (g: string) => g.toLowerCase() === gem.toLowerCase()
            ) &&
            !REMOVED_QUEST_REWARDS.includes(q.quest)
        )
        .map((q: QuestReward) => `Ato ${q.act} - ${q.quest}`);
      // Vendors onde a gema pode ser comprada
      const vendorRewards = vendors
        .filter((v: QuestReward) => {
          if (
            hideSiosa &&
            v.vendor === "Siosa" &&
            v.act === 3 &&
            v.quest === "A Fixture of Fate"
          )
            return false;
          if (
            hideLilly &&
            v.vendor === "Lilly Roth" &&
            v.act === 6 &&
            v.quest === "Fallen from Grace"
          )
            return false;
          return (
            isCharacterClass(selectedClass) &&
            v[selectedClass].some(
              (g: string) => g.toLowerCase() === gem.toLowerCase()
            )
          );
        })
        .map(
          (v: QuestReward) =>
            `${v.vendor} - Ato ${v.act}${v.quest ? " - After " + v.quest : ""}`
        );
      return {
        gem,
        quests: questRewards,
        vendors: vendorRewards,
      };
    });
  }

  return (
    <div className="gem-finder">
      <h1>PoE Gem Finder</h1>
      <div className="finder-form">
        <div className="finder-field" style={{ marginBottom: "1.2rem" }}>
          <Select
            id="class-select"
            options={CHARACTER_CLASSES}
            value={
              CHARACTER_CLASSES.find((c) => c.value === selectedClass) || null
            }
            onChange={(option) => {
              setSelectedClass(option?.value as CharacterClass);
              setShowResults(false);
            }}
            isSearchable={false}
            placeholder="Selecione a classe..."
            classNamePrefix="gem-select"
            styles={{
              control: (base) => ({
                ...base,
                background: "#232323",
                borderColor: "#af6025",
                color: "#c8beb7",
                minWidth: 200,
              }),
              menu: (base) => ({
                ...base,
                background: "#232323",
                color: "#c8beb7",
              }),
              singleValue: (base) => ({ ...base, color: "#c8beb7" }),
              option: (base, state) => ({
                ...base,
                background: state.isFocused ? "#af6025" : "#232323",
                color: state.isFocused ? "#232323" : "#c8beb7",
              }),
              input: (base) => ({ ...base, color: "#c8beb7" }),
              placeholder: (base) => ({ ...base, color: "#888" }),
            }}
          />
        </div>
        <div className="finder-field" style={{ marginBottom: "1.2rem" }}>
          <Select
            id="gem-multiselect"
            isMulti
            options={gemOptions}
            value={selectedGems}
            onChange={(value) =>
              setSelectedGems(value as { label: string; value: string }[])
            }
            placeholder="Choose gems..."
            classNamePrefix="gem-select"
            isDisabled={!selectedClass}
            styles={{
              control: (base) => ({
                ...base,
                background: "#232323",
                borderColor: "#af6025",
                color: "#c8beb7",
                minWidth: 320,
                maxWidth: 400,
                width: 350,
              }),
              menu: (base) => ({
                ...base,
                background: "#232323",
                color: "#c8beb7",
              }),
              multiValue: (base) => ({
                ...base,
                background: "#af6025",
                color: "#232323",
                borderRadius: 6,
                fontSize: "0.75em",
                minHeight: 18,
                height: 18,
                margin: "1px 1px",
                padding: "0 1px",
                display: "flex",
                alignItems: "center",
              }),
              multiValueLabel: (base) => ({
                ...base,
                color: "#232323",
                fontWeight: 600,
                fontSize: "0.75em",
                padding: "0 3px",
              }),
              multiValueRemove: (base) => ({
                ...base,
                color: "#232323",
                fontSize: "0.9em",
                padding: 0,
                ":hover": { background: "#c8beb7", color: "#af6025" },
              }),
              option: (base, state) => ({
                ...base,
                background: state.isFocused ? "#af6025" : "#232323",
                color: state.isFocused ? "#232323" : "#c8beb7",
              }),
              input: (base) => ({ ...base, color: "#c8beb7" }),
              placeholder: (base) => ({ ...base, color: "#888" }),
            }}
          />
        </div>
        <div
          className="finder-field"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "0.5rem",
            margin: "1rem 0 0.5rem 0",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontWeight: 400,
            }}
          >
            <input
              type="checkbox"
              checked={hideSiosa}
              onChange={(e) => setHideSiosa(e.target.checked)}
            />
            Hidden Siosa
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontWeight: 400,
            }}
          >
            <input
              type="checkbox"
              checked={hideLilly}
              onChange={(e) => setHideLilly(e.target.checked)}
            />
            Hidden Lilly Roth
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontWeight: 400,
            }}
          >
            <input
              type="checkbox"
              checked={onlyVendors}
              onChange={(e) => {
                setOnlyVendors(e.target.checked);
                if (e.target.checked) setOnlyRewards(false);
              }}
            />
            Hidden Rewards
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontWeight: 400,
            }}
          >
            <input
              type="checkbox"
              checked={onlyRewards}
              onChange={(e) => {
                setOnlyRewards(e.target.checked);
                if (e.target.checked) setOnlyVendors(false);
              }}
            />
            Hidden Vendors
          </label>
        </div>
      </div>
      {showResults && (
        <div className="results">
          {(() => {
            let rows = getGemAcquisitionRows(
              selectedGems,
              selectedClass,
              results.quests,
              results.vendors
            );
            if (onlyVendors) {
              rows = rows.filter(
                (row) => row.quests.length === 0 && row.vendors.length > 0
              );
            }
            if (onlyRewards) {
              rows = rows.filter((row) => row.quests.length > 0);
            }
            if (rows.length === 0) {
              return <p className="no-results">No results found.</p>;
            }
            return (
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Gema</th>
                    {!onlyVendors && <th>Quest Rewards</th>}
                    <th>Vendor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.gem + idx}>
                      <td>{row.gem}</td>
                      {!onlyVendors && (
                        <td>
                          {row.quests.length > 0 ? (
                            row.quests.map((q, i) => (
                              <>
                                <div key={i}>{q}</div>
                                {i < row.quests.length - 1 && (
                                  <hr
                                    style={{
                                      margin: "0.3em 0",
                                      border: "none",
                                      borderTop: "1px solid #444",
                                    }}
                                  />
                                )}
                              </>
                            ))
                          ) : (
                            <span style={{ color: "#888" }}>-</span>
                          )}
                        </td>
                      )}
                      <td>
                        {row.vendors.length > 0 ? (
                          row.vendors.map((v, i) => (
                            <>
                              <div key={i}>{v}</div>
                              {i < row.vendors.length - 1 && (
                                <hr
                                  style={{
                                    margin: "0.3em 0",
                                    border: "none",
                                    borderTop: "1px solid #444",
                                  }}
                                />
                              )}
                            </>
                          ))
                        ) : (
                          <span style={{ color: "#888" }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}
    </div>
  );
}
