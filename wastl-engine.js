/*
 * Wastl Engine 4.0 – eigenständiger, vollständig offline ausführbarer Regelkern.
 * Eigenständige Implementierung; keine Abhängigkeiten oder importierten KI-Modelle.
 * Kein Spielstärke-Solver: KEINE automatischen Zugnoten oder Gewinnwahrscheinlichkeiten.
 * Lizenz: Eigener Quellcode im Projekt des Schafkopftrackers.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WastlEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '4.1.0';
  const SUITS = Object.freeze(['eichel', 'gras', 'herz', 'schell']);
  const RANKS = Object.freeze(['A', '10', 'K', 'O', 'U', '9', '8', '7']);
  const EYES = Object.freeze({ A: 11, '10': 10, K: 4, O: 3, U: 2, '9': 0, '8': 0, '7': 0 });
  // Reihenfolge am Schafkopftisch im Uhrzeigersinn (Vorhand, Mittelhand, Hinterhand, Geber).
  const SEATS = Object.freeze(['vh', 'mh', 'hh', 'g']);
  const STANDARD = new Set(['rufspiel', 'solo', 'wenz', 'farbwenz', 'geier', 'farbgeier', 'bettel', 'ramsch', 'hochzeit', 'kreuzrunde', 'tout']);
  const CALL = new Set(['rufspiel', 'hochzeit']);
  const SINGLE = new Set(['solo', 'wenz', 'farbwenz', 'geier', 'farbgeier', 'bettel', 'tout']);
  const COLORS = new Set(['solo', 'farbwenz', 'farbgeier', 'tout']);
  const FULL = Object.freeze(SUITS.flatMap(s => RANKS.map(r => `${s}-${r}`)));

  function parse(card) {
    if (typeof card !== 'string') return null;
    const sep = card.lastIndexOf('-');
    if (sep === -1) return null;
    const suit = card.slice(0, sep), rank = card.slice(sep + 1);
    if (!SUITS.includes(suit) || !RANKS.includes(rank)) return null;
    return { id: card, suit, rank, eyes: EYES[rank] };
  }
  function config(game) {
    const type = game?.type;
    if (!STANDARD.has(type)) return { supported: false, reason: `Spielart „${String(type ?? 'unbekannt')}“ ist in Engine 4.0 noch nicht verifiziert.` };
    if (COLORS.has(type) && !SUITS.includes(game.trumpSuit)) return { supported: false, reason: 'Für diese Spielart fehlt eine gültige Trumpffarbe.' };
    if (type === 'rufspiel' && !['eichel', 'gras', 'schell'].includes(game.calledSuit)) return { supported: false, reason: 'Für Rufspiel fehlt eine gültige gerufene Farbe.' };
    return { supported: true, reason: '' };
  }
  function isTrump(card, game) {
    const c = typeof card === 'string' ? parse(card) : card;
    if (!c) return false;
    const t = game.type;
    if (t === 'bettel') return false;
    if (t === 'wenz') return c.rank === 'U';
    if (t === 'geier') return c.rank === 'O';
    if (t === 'farbwenz') return c.rank === 'U' || c.suit === game.trumpSuit;
    if (t === 'farbgeier') return c.rank === 'O' || c.suit === game.trumpSuit;
    if (t === 'solo' || t === 'tout') return c.rank === 'O' || c.rank === 'U' || c.suit === game.trumpSuit;
    return c.rank === 'O' || c.rank === 'U' || c.suit === 'herz';
  }
  function colorClass(card, game) {
    const c = typeof card === 'string' ? parse(card) : card;
    return !c ? null : (isTrump(c, game) ? 'TRUMPF' : c.suit);
  }
  function trumpOrder(game) {
    const t = game.type;
    const core = ['wenz', 'farbwenz'].includes(t) ? ['U'] : ['geier', 'farbgeier'].includes(t) ? ['O'] : ['O', 'U'];
    const suit = ['solo', 'tout', 'farbwenz', 'farbgeier'].includes(t) ? game.trumpSuit : 'herz';
    const order = core.flatMap(rank => SUITS.map(s => `${s}-${rank}`));
    if (t !== 'wenz' && t !== 'geier' && t !== 'bettel') {
      order.push(...RANKS.filter(rank => !core.includes(rank)).map(rank => `${suit}-${rank}`));
    }
    return order;
  }
  // Minus bedeutet „a“ schlägt „b“; keine Pflicht auf höheren Trumpf.
  function compare(a, b, lead, game) {
    const x = parse(a), y = parse(b), initial = parse(lead);
    if (!x || !y || !initial) throw new TypeError('Ungültige Karte im Stichvergleich');
    const tx = isTrump(x, game), ty = isTrump(y, game);
    if (tx !== ty) return tx ? -1 : 1;
    if (tx) return trumpOrder(game).indexOf(x.id) - trumpOrder(game).indexOf(y.id);
    const leadColor = colorClass(initial, game);
    const ax = colorClass(x, game) === leadColor, by = colorClass(y, game) === leadColor;
    if (ax !== by) return ax ? -1 : 1;
    if (!ax && !by) return 0;
    const rankOrder = RANKS;
    return rankOrder.indexOf(x.rank) - rankOrder.indexOf(y.rank);
  }
  function legalMoves(hand, lead, game) {
    if (!Array.isArray(hand) || hand.some(c => !parse(c))) throw new TypeError('Hand enthält ungültige Karten');
    if (lead == null) return [...hand];
    if (!parse(lead)) throw new TypeError('Ungültige Anspielkarte');
    const suit = colorClass(lead, game);
    const following = hand.filter(c => colorClass(c, game) === suit);
    return following.length ? following : [...hand];
  }
  function winnerIndex(cards, game) {
    if (!Array.isArray(cards) || cards.length !== 4 || cards.some(c => !parse(c))) return -1;
    let best = 0;
    for (let i = 1; i < 4; i++) if (compare(cards[i], cards[best], cards[0], game) < 0) best = i;
    return best;
  }
  function nextSeat(seat, steps = 1) {
    const i = SEATS.indexOf(seat);
    if (i < 0 || !Number.isInteger(steps)) return null;
    return SEATS[((i + steps) % 4 + 4) % 4];
  }
  function trickEyes(cards) {
    if (!Array.isArray(cards) || cards.some(c => !parse(c))) return null;
    return cards.reduce((n, c) => n + parse(c).eyes, 0);
  }
  function countCards(game) {
    const actual = (game?.tricks || []).flatMap(t => Array.isArray(t?.cards) ? t.cards : []);
    const frequencies = new Map();
    for (const c of actual) frequencies.set(c, (frequencies.get(c) || 0) + 1);
    return {actual, duplicates: [...frequencies].filter(([, n]) => n > 1).map(([c]) => c), missing: FULL.filter(c => !frequencies.has(c))};
  }
  function reconstructHands(game) {
    const hands = Object.fromEntries(SEATS.map(s => [s, []]));
    for (const t of game.tricks) {
      if (!SEATS.includes(t?.leaderSeat) || !Array.isArray(t.cards) || t.cards.length !== 4) return null;
      for (let i = 0; i < 4; i++) hands[nextSeat(t.leaderSeat, i)].push(t.cards[i]);
    }
    return hands;
  }
  function partnership(game, hands) {
    if (game.type === 'ramsch') return null;
    if (game.type === 'kreuzrunde') return { team: ['vh', 'hh'], against: ['mh', 'g'], label: 'Team Vorhand/Hinterhand' };
    if (SINGLE.has(game.type)) {
      if (!SEATS.includes(game.declarerSeat)) return null;
      return { team: [game.declarerSeat], against: SEATS.filter(s => s !== game.declarerSeat), label: 'Ansager' };
    }
    if (CALL.has(game.type)) {
      if (!SEATS.includes(game.declarerSeat)) return null;
      let partner = null;
      if (game.type === 'rufspiel') {
        if (!hands) return null;
        partner = SEATS.find(seat => hands[seat].includes(`${game.calledSuit}-A`));
        if (!partner || partner === game.declarerSeat) return null;
      } else if (SEATS.includes(game.partnerSeat) && game.partnerSeat !== game.declarerSeat) partner = game.partnerSeat;
      else return null;
      return { team: [game.declarerSeat, partner], against: SEATS.filter(s => s !== game.declarerSeat && s !== partner), label: 'Ansagerteam' };
    }
    return null;
  }
  function outcome(game, teams, tricks) {
    if (game.type === 'ramsch') return { status: 'not-supported', reason: 'Ramsch und Jungfrauen werden derzeit nur auf Stichregeln, nicht auf Hausregel-Ergebnisse geprüft.' };
    if (!teams) return { status: 'unknown', reason: 'Ansager beziehungsweise Partner konnten nicht zweifelsfrei bestimmt werden.' };
    if (game.type === 'bettel') {
      const took = tricks.some(t => t.winnerSeat === game.declarerSeat);
      return { status: 'known', winner: took ? 'opponents' : 'declarer', reason: took ? 'Bettel verloren: Ansager hat einen Stich gemacht.' : 'Bettel gewonnen: Ansager hat keinen Stich gemacht.' };
    }
    if (game.type === 'tout') {
      const all = tricks.every(t => t.winnerSeat === game.declarerSeat);
      return { status: 'known', winner: all ? 'declarer' : 'opponents', reason: all ? 'Tout gewonnen: Ansager hat alle acht Stiche.' : 'Tout verloren: Mindestens ein Stich ging an die Gegenpartei.' };
    }
    const score = tricks.reduce((sum, t) => sum + (teams.team.includes(t.winnerSeat) ? t.eyes : 0), 0);
    return { status: 'known', winner: score >= 61 ? 'declarer' : 'opponents', reason: score >= 61 ? `Ansagerpartei gewinnt mit ${score} Augen.` : `Gegenpartei gewinnt mit ${120 - score} Augen (${score} Augen für die Ansagerpartei).` };
  }
  function review(game) {
    const errors = [], warnings = [];
    const fatal = code => (message, trick) => errors.push({code, message, ...(Number.isInteger(trick) ? { trick } : {})});
    const wrong = fatal('invalid-input');
    if (!game || !Array.isArray(game.tricks)) return {ok:false, supported:false, errors:[{code:'invalid-input', message:'Kein Stichverlauf vorhanden.'}], warnings:[], tricks:[]};
    const cfg = config(game);
    if (!cfg.supported) warnings.push({code:'unsupported-type', message:cfg.reason});
    if (game.tricks.length !== 8) wrong('Eine vollständige Partie enthält genau acht Stiche.');
    if (game.tricks.length > 8) wrong('Mehr als acht Stiche sind im langen Blatt nicht möglich.');
    const deck = countCards(game);
    for (const card of deck.actual) if (!parse(card)) wrong(`Unbekannte Karte: ${String(card)}.`);
    if (deck.duplicates.length) errors.push({code:'duplicate-cards', message:`Doppelte Karten: ${deck.duplicates.join(', ')}.`});
    if (deck.missing.length) errors.push({code:'missing-cards', message:`${deck.missing.length} Karten fehlen in dieser Partie.`});
    if (deck.actual.length !== 32) wrong(`Es wurden ${deck.actual.length} von 32 Karten erfasst.`);
    const hands = deck.actual.every(c => !!parse(c)) ? reconstructHands(game) : null;
    if (!hands) wrong('Mindestens ein Stich hat keine vier gültigen Karten oder keinen gültigen Ausspieler.');
    else for (const seat of SEATS) if (hands[seat].length !== 8) wrong(`Spieler ${seat.toUpperCase()} hat ${hands[seat].length} statt acht Karten.`);
    const seen = Object.fromEntries(SEATS.map(s => [s, new Set()]));
    const normalized = [];
    let previousWinner = null;
    for (let i = 0; i < Math.min(8, game.tricks.length); i++) {
      const t = game.tricks[i];
      if (!t || !Array.isArray(t.cards) || t.cards.length !== 4 || t.cards.some(c => !parse(c)) || !SEATS.includes(t.leaderSeat)) {
        errors.push({code:'bad-trick', trick:i+1, message:`Stich ${i+1} ist unvollständig.`}); continue;
      }
      if (i > 0 && previousWinner !== null && t.leaderSeat !== previousWinner) errors.push({code:'lead-mismatch', trick:i+1, message:`Stich ${i+1}: Nach dem vorherigen Stich müsste ${previousWinner.toUpperCase()} ausspielen.`});
      const winIdx = cfg.supported ? winnerIndex(t.cards,game) : -1;
      const winnerSeat = winIdx < 0 ? null : nextSeat(t.leaderSeat,winIdx);
      if (winnerSeat && SEATS.includes(t.winnerSeat) && winnerSeat !== t.winnerSeat) errors.push({code:'winner-mismatch', trick:i+1, message:`Stich ${i+1}: Der gespeicherte Stichgewinner ${t.winnerSeat.toUpperCase()} widerspricht der Regelberechnung (${winnerSeat.toUpperCase()}).`});
      if (winnerSeat && !SEATS.includes(t.winnerSeat)) warnings.push({code:'missing-winner', trick:i+1, message:`Stich ${i+1}: Kein gespeicherter Stichgewinner, berechnet: ${winnerSeat.toUpperCase()}.`});
      if (cfg.supported && hands) {
        for (let j=0; j<4;j++) {
          const seat = nextSeat(t.leaderSeat, j);
          const available = hands[seat].filter(c => !seen[seat].has(c));
          const follow = j===0 ? null : t.cards[0];
          const options = legalMoves(available, follow, game);
          if (!options.includes(t.cards[j])) errors.push({code:'follow-suit', trick:i+1, message:`Stich ${i+1}: ${seat.toUpperCase()} bedient Farbe/Trumpf nicht, obwohl passende Karten rekonstruiert wurden.`});
          seen[seat].add(t.cards[j]);
        }
      }
      const eyes = trickEyes(t.cards);
      normalized.push({index:i+1,leaderSeat:t.leaderSeat,winnerSeat,eyes,cards:[...t.cards]});
      previousWinner = winnerSeat;
    }
    const eyesTotal=normalized.reduce((n,t)=>n+t.eyes,0);
    if(game.tricks.length === 8 && eyesTotal !== 120) errors.push({code:'eyes', message:`Die erfassten Stiche ergeben ${eyesTotal} statt 120 Augen.`});
    const reliable = errors.length === 0 && cfg.supported && game.tricks.length === 8;
    const teams = reliable ? partnership(game,hands) : null;
    const teamEyes = teams ? normalized.reduce((n,t)=>{if(teams.team.includes(t.winnerSeat))n.declarer+=t.eyes;else n.opponents+=t.eyes;return n;},{declarer:0,opponents:0}) : null;
    const result = reliable ? outcome(game,teams,normalized) : {status:'unreliable',reason:'Wegen offener Regel-/Erfassungsfehler wird kein Gewinner behauptet.'};
    return {version:VERSION,ok:reliable,supported:cfg.supported,errors,warnings,tricks:normalized,eyesTotal,teams,teamEyes,result, note:'Regelprüfung ≠ Strategiebewertung. Kein Zug wurde als besser oder schlechter eingestuft.'};
  }
  return Object.freeze({ VERSION, SUITS, RANKS, SEATS, FULL, parse, config, isTrump, colorClass, compare, legalMoves, winnerIndex, trickEyes, nextSeat, reconstructHands, partnership, review });
});
