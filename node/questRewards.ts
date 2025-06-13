const axios = require('axios');
const cheerio = require('cheerio');
const { writeFile } = require('fs').promises;
const fs = require('fs');

function parseQuestAndAct(text) {
  // Exemplo: "Enemy at the Gate\nAct 1" ou "Enemy at the GateAct 1"
  const match = text.match(/^(.*?)(?:\s*Act\s*(\d+))?$/i);
  return {
    quest: match && match[1] ? match[1].trim() : text.trim(),
    act: match && match[2] ? parseInt(match[2], 10) : null
  };
}

function parseVendorTh(th) {
  // Exemplo: "Sever the Right Hand<br />Act 3<br />Clarissa"
  const parts = th.html().split(/<br\s*\/?>(?:\s*)?/i).map(s => cheerio.load(s).text().trim());
  let quest = parts[0] || '';
  let act = null;
  let vendor = null;
  if (parts.length >= 2) {
    const actMatch = parts[1].match(/Act\s*(\d+)/i);
    if (actMatch) act = parseInt(actMatch[1], 10);
    if (parts.length >= 3) vendor = parts[2];
  }
  return { quest, act, vendor };
}

function distributeRewards(entry) {
  // Verifica se apenas a witch tem recompensas e as outras classes estão vazias
  const hasOnlyWitchRewards = entry.witch.length > 0 && 
    entry.shadow.length === 0 && 
    entry.ranger.length === 0 && 
    entry.duelist.length === 0 && 
    entry.marauder.length === 0 && 
    entry.templar.length === 0 && 
    entry.scion.length === 0;

  // Se apenas a witch tem recompensas, distribui para todas as classes
  if (hasOnlyWitchRewards) {
    entry.shadow = [...entry.witch];
    entry.ranger = [...entry.witch];
    entry.duelist = [...entry.witch];
    entry.marauder = [...entry.witch];
    entry.templar = [...entry.witch];
    entry.scion = [...entry.witch];
  }

  return entry;
}

async function scrapeQuestRewards() {
  try {
    let html;
    if (fs.existsSync('pagina.html')) {
      html = fs.readFileSync('pagina.html', 'utf-8');
    } else {
      const response = await axios.get('https://www.poewiki.net/wiki/Quest_Rewards', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      html = response.data;
      fs.writeFileSync('pagina.html', html);
    }
    const $ = cheerio.load(html);
    
    const result = { reward: [], vendor: [] };
    
    // Primeira tabela: recompensas de quest
    const tables = $('table.wikitable.sortable');
    if (tables.length === 0) {
      console.log('Nenhuma tabela encontrada!');
      return;
    }
    // Primeira tabela: reward
    const rewardTable = tables.eq(0);
    const rewardHeaders = rewardTable.find('tr').eq(0).find('th');
    rewardTable.find('tr').slice(1).each((i, row) => {
      const tds = $(row).find('td');
      const th = $(row).find('th');
      if (tds.length === 0 || th.length === 0) return;
      const questAct = parseQuestAndAct(th.text().replace(/\n/g, ' '));
      const entry = {
        quest: questAct.quest,
        act: questAct.act,
        rewardType: 'reward',
        witch: [], shadow: [], ranger: [], duelist: [], marauder: [], templar: [], scion: []
      };
      tds.each((idx, td) => {
        const className = rewardHeaders.eq(idx + 1).text().toLowerCase();
        entry[className] = $(td).html().split(/<br\s*\/?>(?:\s*)?/i).map(s => cheerio.load(s).text().trim()).filter(Boolean);
      });
      result.reward.push(distributeRewards(entry));
    });
    // Segunda tabela: vendor
    const vendorTable = tables.eq(1);
    const vendorHeaders = vendorTable.find('tr').eq(0).find('th');
    vendorTable.find('tr').slice(1).each((i, row) => {
      const tds = $(row).find('td');
      const th = $(row).find('th');
      if (tds.length === 0 || th.length === 0) return;
      const { quest, act, vendor } = parseVendorTh(th);
      const entry = {
        quest,
        act,
        vendor,
        rewardType: 'vendor',
        witch: [], shadow: [], ranger: [], duelist: [], marauder: [], templar: [], scion: []
      };
      tds.each((idx, td) => {
        const className = vendorHeaders.eq(idx + 1).text().toLowerCase();
        entry[className] = $(td).html().split(/<br\s*\/?>(?:\s*)?/i).map(s => cheerio.load(s).text().trim()).filter(Boolean);
      });
      result.vendor.push(distributeRewards(entry));
    });
    await writeFile('src/scrapers/questRewards.json', JSON.stringify(result, null, 2), 'utf-8');
    console.log('Arquivo questRewards.json salvo com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
  }
}

scrapeQuestRewards(); 