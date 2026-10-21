/* How to play, in the game's own words: a paraphrase of the rules the
 * engine plays. */

import { SKIN } from "../data/skin.js";

export const HELP_TABS = [
  ["Goal", `
<p>Build the richest network in ${SKIN.setting}. Produce commodities, sell them into a market whose prices you and your rivals keep moving, and spend the proceeds on <b>railroads</b> (won at auction), <b>buildings</b> and <b>towns</b> (bought with commodities). The most victory points at the end wins; a tie goes to the player with more money.</p>
<p>You start with $10, three Price &amp; Production cards and a few free commodities: the first player takes one, the next two, and so on, all of different kinds.</p>`],
  ["A turn", `
<p>Players take turns clockwise, one action each:</p>
<ul>
<li><b>Produce</b> — play a card from your hand. Take three of the commodities in its red Production half (more with a Cottage Industry or Factory, never more than it shows), plus the bonus of one of your bonus buildings. Then every commodity in its blue Price half rises $1 per icon. Draw back up to your hand limit.</li>
<li><b>Sell</b> — sell any number of one commodity at its current price. Its price then falls $1 per unit sold.</li>
<li><b>Auction</b> — put up one of the two railroads on offer, opening at least at its minimum bid. Bidding goes clockwise; a pass is final; nobody bids more than they hold. If you lose the auction you act again. With two players the opener bids once and the other player bids once.</li>
<li><b>Buy a building</b> — pay its price; or pay the +2 price to upgrade a commodity building you own.</li>
<li><b>Build a town</b> — pay the town's count of its own commodity, or its larger count of any mix.</li>
</ul>
<p>You may hold ten commodities, one more for each building you own (a Warehouse adds four). Over the limit after producing, you discard down to it.</p>`],
  ["The market", `
<p>Each commodity has its own track of twelve prices. Wheat and Wood run $1–$12, Iron and Coal $2–$13, Goods and Luxury $3–$14. A price never leaves its track. Producing pushes prices up, selling pushes them down, so a commodity everyone has been producing is worth selling, and one just sold is cheap to hold.</p>
<p>Money is secret at the table. Every transaction is public, though, so a careful player (and every bot) can keep count.</p>`],
  ["Scoring", `
<ul>
<li>Each town's VP.</li>
<li>Each railroad line's VP, read from its strip by how many cards of that line you own: the number is the total for all of them, not each.</li>
<li>1 VP per building, plus the end-game bonuses of the Governor's Mansion, Rail Baron, Bank and Mayor's Office.</li>
<li>2 VP for every town you can pair with a railroad card.</li>
<li>Your mission, if missions are in play.</li>
</ul>
<p>The game ends when the last town is built or the last railroad auctioned (or, with the Long ending, when two of towns, railroads and buildings are all owned). The round is played out so everyone has had the same number of turns.</p>`],
  ["Keys", `
<ul>
<li>Hover over a card (or focus it) for what producing with it would do, buildings named</li>
<li>Click a card to produce with it. A card that takes only some of its commodities shows its choices first, the most valuable today at the front: click one, or click the card again for the first; <b>Esc</b> puts it back</li>
<li><b>1</b>–<b>5</b> — produce with that card, or show its choices</li>
<li>Sell buttons sell all of a commodity in one press; <b>…</b> beside one sells fewer</li>
<li><b>S</b> — jump to Sell; <b>A</b>, <b>B</b>, <b>T</b> — jump to the railroads, buildings or town in the table, where those moves are made. A jump never commits; the arrow keys then walk the list</li>
<li>Buying a building or a town paid in its own commodity is two presses on the same row or button (a double-click does both): the first shows what it costs and brings, the second spends; <b>Esc</b> cancels</li>
<li><b>A</b> while selling — sell all</li>
<li><b>Enter</b> — take the keyboard when it is passed to you (hot seat)</li>
<li>Bidding: <b>Enter</b> bids the amount on the Bid button (the minimum, unless you change it); <b>↑</b> <b>↓</b> walk it $1, with <b>Shift</b> $5; <b>P</b> passes; <b>Esc</b> takes back an auction you have not opened yet</li>
<li><b>M</b> — sound on and off, anywhere</li>
<li><b>?</b> — this help; <b>Esc</b> closes it</li>
<li>In the walkthrough: <b>Enter</b> or <b>→</b> next, <b>←</b> back, <b>Esc</b> to end it</li>
</ul>`],
  ["Fine print", `
<p>A few rules can be read more than one way. Here they play like this:</p>
<ul>
<li>If everyone else passes, the opener wins the auction at their opening bid.</li>
<li>Winning bids go to the bank. The Auction House's $5 arrives after the auction, so it cannot help pay the bid; it pays its owner on their own auctions too.</li>
<li>Commodities never run out. When the Price &amp; Production deck does, the discards are shuffled into a new one.</li>
<li>A bigger hand from the Smuggler or Black Market fills at your next production, not when you buy it.</li>
<li>A building works from the moment it is bought, so a Construction Company allows its own second purchase.</li>
<li>Freight Company's second sale must be a different commodity.</li>
<li>A Trading Floor purchase pays the other player the market price. It is not a sale: no price drop, no Trading Firm income, no Export Company rise.</li>
<li>Trading Firm income is paid by the bank, and a Trading Firm pays on its owner's own sales too.</li>
<li>Brick Works takes one off either way of paying for a town. Mayor's Office counts itself among your buildings.</li>
<li>The Machine Shop / Water Mill is in the advanced stack.</li>
<li>A tie for "most" on a mission scores nothing. A tie on both points and money is shared.</li>
<li>Sudden Death is offered at the start of your own turn, while you hold $1,000.</li>
<li>In a two-player game, which towns are removed is random.</li>
<li>"The last railroad is auctioned" means none are left to deal and none are on offer.</li>
</ul>`],
];
