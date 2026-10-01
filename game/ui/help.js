/* How to play, in the game's own words: a paraphrase of the rules the
 * engine plays, never the rulebook's text. */

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
<li><b>Auction</b> — put up one of the two railroads on offer, opening at least at its minimum bid. Bidding goes clockwise; a pass is final; nobody bids more than they hold. If you lose the auction you act again.</li>
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
<p>The game ends when the last town is built or the last railroad auctioned (or, under the designer's revision, when two of towns, railroads and buildings are all owned). The round is played out so everyone has had the same number of turns.</p>`],
  ["Keys", `
<ul>
<li><b>1</b>–<b>5</b> — preview producing with that card; <b>Enter</b> on Produce commits, <b>Esc</b> puts it back</li>
<li><b>S</b>, <b>A</b>, <b>B</b>, <b>T</b> — jump to Sell, Auction, Buy or the Town; a jump never commits</li>
<li><b>A</b> while selling — sell all</li>
<li><b>Enter</b> — take the keyboard from the curtain; place the bid</li>
<li><b>?</b> — this help; <b>Esc</b> closes it</li>
<li>In the walkthrough: <b>Enter</b> or <b>→</b> next, <b>←</b> back, <b>Esc</b> to end it</li>
</ul>`],
  ["About", `
<p>${SKIN.game} is a port of <i>Raccoon Tycoon</i> by Glenn Drover (Forbidden Games, 2018), with original artwork and renamed places. Where the rulebook is silent, the game's choice is listed in the README under <i>What's approximated</i>, beside the designer's and publisher's own rulings that settled the rest.</p>`],
];
