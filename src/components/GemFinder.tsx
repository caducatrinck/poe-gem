import { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import type {
  QuestRewardsData,
  QuestReward,
  CharacterClass,
} from "../types/questRewards";
import { loadPobBuild } from "../utils/pob";
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

interface GemInfo {
  level: number;
  attribute: string;
  str: number;
  dex: number;
  int: number;
}

// Ex.: "21 Str / 14 Int"; se não houver números, cai para o nome do atributo
function formatRequirements(info?: GemInfo) {
  if (!info) return "-";
  const parts = [
    info.str > 0 && `${info.str} Str`,
    info.dex > 0 && `${info.dex} Dex`,
    info.int > 0 && `${info.int} Int`,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(" / ");
  // Gemas de nível baixo começam com requisito 0 no atributo principal
  const abbr: Record<string, string> = {
    strength: "Str",
    dexterity: "Dex",
    intelligence: "Int",
  };
  return abbr[info.attribute] ? `0 ${abbr[info.attribute]}` : "-";
}

const ATTRIBUTE_COLORS: Record<string, string> = {
  strength: "#e05a4b",
  dexterity: "#5ec26a",
  intelligence: "#6b9eff",
};

const STORAGE_KEY = "poe-gem:build";

interface SavedBuild {
  selectedClass: CharacterClass | "";
  selectedGems: { label: string; value: string }[];
}

// localStorage pode falhar (modo privado, dados bloqueados); nesse caso segue sem cache
function loadSavedBuild(): SavedBuild {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.selectedGems)) {
        return {
          selectedClass: data.selectedClass || "",
          selectedGems: data.selectedGems,
        };
      }
    }
  } catch {
    /* ignora */
  }
  return { selectedClass: "", selectedGems: [] };
}

export function GemFinder() {
  const [saved] = useState(loadSavedBuild);
  const [questRewards, setQuestRewards] = useState<QuestRewardsData | null>(
    null
  );
  const [selectedClass, setSelectedClass] = useState<CharacterClass | "">(
    saved.selectedClass
  );
  const [selectedGems, setSelectedGems] = useState<
    { label: string; value: string }[]
  >(saved.selectedGems);
  const [results, setResults] = useState<{
    quests: QuestReward[];
    vendors: QuestReward[];
  }>({ quests: [], vendors: [] });
  const [showResults, setShowResults] = useState(false);
  const [hideSiosa, setHideSiosa] = useState(false);
  const [hideLilly, setHideLilly] = useState(false);
  const [onlyVendors, setOnlyVendors] = useState(false);
  const [onlyRewards, setOnlyRewards] = useState(false);
  // Ordem real de progressão das quests por ato (public/questOrder.json)
  const [questOrder, setQuestOrder] = useState<Record<string, string[]>>({});
  const [pobInput, setPobInput] = useState("");
  const [pobStatus, setPobStatus] = useState("");
  const [gemInfo, setGemInfo] = useState<Record<string, GemInfo>>({});

  useEffect(() => {
    fetch("/questOrder.json")
      .then((response) => response.json())
      .then((data: Record<string, string[]>) => setQuestOrder(data))
      .catch((error) => console.error("Erro ao carregar questOrder:", error));
  }, []);

  useEffect(() => {
    fetch("/gemInfo.json")
      .then((response) => response.json())
      .then((data: Record<string, GemInfo>) => setGemInfo(data))
      .catch((error) => console.error("Erro ao carregar gemInfo:", error));
  }, []);

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

  // Salva a build atual para não precisar importar de novo ao reabrir
  useEffect(() => {
    try {
      if (selectedClass || selectedGems.length > 0) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ selectedClass, selectedGems })
        );
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignora */
    }
  }, [selectedClass, selectedGems]);

  function clearBuild() {
    setSelectedClass("");
    setSelectedGems([]);
    setPobInput("");
    setPobStatus("");
  }

  async function importPob() {
    if (!pobInput.trim()) return;
    setPobStatus("Carregando...");
    try {
      const build = await loadPobBuild(pobInput);
      const byName = new Map(allGems.map((g) => [g.toLowerCase(), g]));
      const found: string[] = [];
      const ignored: string[] = [];
      for (const name of build.gems) {
        // Suportes no PoB vêm sem o sufixo "Support"
        const match =
          byName.get(name.toLowerCase()) ??
          byName.get(`${name} Support`.toLowerCase());
        if (match) found.push(match);
        else ignored.push(name);
      }
      const cls = build.className.toLowerCase();
      if (isCharacterClass(cls)) setSelectedClass(cls);
      setSelectedGems(
        [...new Set(found)].map((g) => ({ value: g, label: g }))
      );
      setPobStatus(
        `${found.length} gemas adicionadas` +
          (ignored.length > 0
            ? `; ${ignored.length} fora das quests/vendors: ${ignored.join(", ")}`
            : "")
      );
    } catch (e) {
      setPobStatus(`Erro ao importar: ${(e as Error).message}`);
    }
  }

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

    // Posição na progressão do jogo: ato e, dentro dele, a ordem da quest nos dados.
    // Vendors contam logo depois da quest a que estão ligados.
    const progressKey = (r: QuestReward) => {
      const idx = (questOrder[r.act] ?? []).indexOf(r.quest);
      return r.act * 10000 + (idx === -1 ? 0 : idx) * 2 + (r.rewardType === "vendor" ? 1 : 0);
    };

    const rows = selectedGems.map((gemObj) => {
      const gem = gemObj.value;

      // Quests onde a gema é recompensa (removendo as da lista)
      const questRewardsList = quests
        .filter(
          (q: QuestReward) =>
            isCharacterClass(selectedClass) &&
            q[selectedClass].some(
              (g: string) => g.toLowerCase() === gem.toLowerCase()
            ) &&
            !REMOVED_QUEST_REWARDS.includes(q.quest)
        )
        .sort((x, y) => progressKey(x) - progressKey(y));

      // Pega o menor ato dos quest rewards para ordenação
      const minActFromQuests =
        questRewardsList.length > 0
          ? Math.min(...questRewardsList.map((q) => q.act))
          : Infinity;

      const questRewards = questRewardsList.map(
        (q: QuestReward) => `Ato ${q.act} - ${q.quest}`
      );

      // Vendors onde a gema pode ser comprada
      const vendorList = vendors
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
        .sort((x, y) => progressKey(x) - progressKey(y));

      const vendorRewards = vendorList.map(
        (v: QuestReward) =>
          `${v.vendor} - Ato ${v.act}${v.quest ? " - After " + v.quest : ""}`
      );

      // Ordem pela quest reward; sem quest reward vai para o fim (por vendor)
      const questKey = Math.min(...questRewardsList.map(progressKey));
      const vendorKey = Math.min(...vendorList.map(progressKey));

      return {
        gem,
        quests: questRewards,
        vendors: vendorRewards,
        minAct: minActFromQuests,
        questKey,
        vendorKey,
      };
    });

    // Da primeira quest reward até a última; sem quest reward ficam no fim.
    // Math.min([]) = Infinity, e Infinity - Infinity = NaN, por isso comparamos à mão.
    const cmp = (x: number, y: number) =>
      x === y ? 0 : x === Infinity ? 1 : y === Infinity ? -1 : x - y;
    rows.sort(
      (a, b) =>
        cmp(a.questKey, b.questKey) ||
        cmp(a.vendorKey, b.vendorKey) ||
        a.gem.localeCompare(b.gem)
    );
    return rows;
  }

  return (
    <div className="gem-finder">
      <h1>PoE Gem Finder</h1>
      <div className="finder-form">
        <div className="finder-field" style={{ marginBottom: "1.2rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", width: 350, flexWrap: "wrap" }}>
            <input
              type="text"
              value={pobInput}
              onChange={(e) => setPobInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && importPob()}
              placeholder="Link do pobb.in ou código do PoB"
              style={{
                flex: 1,
                background: "#232323",
                border: "1px solid #af6025",
                borderRadius: 4,
                color: "#c8beb7",
                padding: "0.4rem 0.6rem",
              }}
            />
            <button type="button" onClick={importPob} disabled={!allGems.length}>
              Importar
            </button>
            {(selectedClass || selectedGems.length > 0) && (
              <button type="button" onClick={clearBuild}>
                Remover build
              </button>
            )}
          </div>
          {pobStatus && (
            <p style={{ fontSize: "0.8em", margin: "0.4rem 0 0", maxWidth: 350 }}>
              {pobStatus}
            </p>
          )}
        </div>
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
            // Aplica os filtros
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
                    <th>Level</th>
                    <th>Atributo</th>
                    {!onlyVendors && <th>Quest Rewards</th>}
                    <th>Vendor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.gem + idx}>
                      <td>{row.gem}</td>
                      <td>{gemInfo[row.gem]?.level ?? "-"}</td>
                      <td
                        style={{
                          color: ATTRIBUTE_COLORS[gemInfo[row.gem]?.attribute],
                          textTransform: "capitalize",
                        }}
                      >
                        {formatRequirements(gemInfo[row.gem])}
                      </td>
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
