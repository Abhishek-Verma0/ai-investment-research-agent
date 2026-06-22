import { runResearch } from '../core/agent/index.js';
import type { Persona, ResearchEvent, Verdict } from '../core/schema/index.js';

/**
 * Tiny command-line harness for the agent — lets us exercise the full
 * resolve→gather→analyze→decide pipeline WITHOUT a UI or HTTP server.
 *
 *   npm run research --workspace server -- "Apple"
 *   npm run research --workspace server -- "Reliance Industries" growth
 */
async function main() {
  const args = process.argv.slice(2);
  const personas: Persona[] = ['growth', 'value', 'balanced'];
  // Last arg is a persona if it matches one; everything else is the company name.
  const maybePersona = args[args.length - 1] as Persona;
  const persona = personas.includes(maybePersona) ? maybePersona : 'balanced';
  const nameParts = personas.includes(maybePersona) ? args.slice(0, -1) : args;
  const companyName = nameParts.join(' ').trim();

  if (!companyName) {
    console.error('Usage: npm run research --workspace server -- "<company>" [growth|value|balanced]');
    process.exit(1);
  }

  console.log(`\n🔎 Researching "${companyName}"  (persona: ${persona})\n`);

  const onEvent = (e: ResearchEvent) => {
    if (e.type === 'step') {
      const icon = e.status === 'start' ? '▶' : '✓';
      console.log(`  ${icon} ${e.node.padEnd(8)} ${e.detail ?? ''}`);
    } else if (e.type === 'error') {
      console.error(`  ✗ ERROR [${e.code}] ${e.message}`);
    }
  };

  try {
    const verdict = await runResearch({ companyName, persona }, onEvent);
    printVerdict(verdict);
  } catch {
    // The error event was already printed by onEvent; exit non-zero.
    process.exit(1);
  }
}

function printVerdict(v: Verdict) {
  const line = '─'.repeat(64);
  console.log(`\n${line}`);
  console.log(`  ${v.decision}   conviction ${v.conviction}/100`);
  console.log(`  ${v.company.name} (${v.company.ticker ?? '—'} · ${v.company.market})`);
  console.log(line);
  console.log(`\n  THESIS\n  ${wrap(v.thesis)}`);

  console.log(`\n  BULL`);
  v.bull.forEach((b) => console.log(`   + ${b.claim} ${cite(b.sourceIds)}`));
  console.log(`\n  BEAR`);
  v.bear.forEach((b) => console.log(`   - ${b.claim} ${cite(b.sourceIds)}`));

  if (v.keyMetrics.length) {
    console.log(`\n  KEY METRICS`);
    v.keyMetrics.forEach((m) => console.log(`   • ${m.label}: ${m.value}`));
  }

  if (v.whatWouldChangeMyMind.length) {
    console.log(`\n  WHAT WOULD CHANGE MY MIND`);
    v.whatWouldChangeMyMind.forEach((w) => console.log(`   • ${w}`));
  }

  console.log(`\n  SOURCES`);
  v.sources.forEach((s, i) => console.log(`   [${i}] ${s.title}${s.url ? ` — ${s.url}` : ''}`));

  console.log(`\n  ${v.disclaimers[0] ?? ''}\n`);
}

function cite(ids: number[]): string {
  return ids.length ? `[${ids.join(', ')}]` : '';
}

function wrap(text: string, width = 78): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur += ' ' + w;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.join('\n  ');
}

main();
