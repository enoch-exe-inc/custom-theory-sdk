import { CustomCost, ExponentialCost, FirstFreeCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { parseBigNumber, BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { game } from "./api/Game";
import { Utils } from "./api/Utils";

var id = "custom_wsp";
var name = "Ext. Weierstraß Sine Product";
var description = "Exploit the inaccuracy of sine's product representation, a result due to Euler which was rigorously proved later by Weierstraß using his famous Factorization Theorem.\n\nIntuitively, the idea behind this formula is to factorize sine using its roots (sine has zeros at each multiple of π), just as one would do for a polynomial.\n\nThe product s_n represents only the n first factors of this infinite product (together with the root at x=0), which means there is some error between s_n(x) and the actual sin(x), depending on n and x. Note that this truncated product s_n approximates sin(x) better for bigger n and smaller x, in particular the approximation becomes bad for a fixed n when x gets large in the sense that the ratio s_n(x)/sin(x) diverges for x -> infty.\n\nHere, the derivative of q with respect to time is set to s_n(χ)/sin(χ) i.e. the ratio from before evaluated at χ (chi), which itself is a value depending on n. Note that increasing n both increases χ and the accuracy of the approximation s_n.";
var authors = "xelaroc (AlexCord#6768)";
var version = 3;

var q = BigNumber.ONE;
var chi = BigNumber.ONE;
var S = BigNumber.ZERO;
var sigma = game.sigmaTotal;

// χ and s_n(χ)/sin(χ) don't need to be evaluated at each tick; only when c1 or n is bought or chiDivN milestone
var updateSineRatio_flag = true;

var q1, q2, n, c1, c2;
var q1Exp, c2Term, chiDivN;

var init = () => {
	currency = theory.createCurrency();

	///////////////////
	// Regular Upgrades
	// q1
	{
		let getDesc = (level) => "q_1=" + getQ1(level).toString(0);
		let getInfo = (level) => "q_1=" + getQ1(level).toString(0);
		q1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(10, 5/6)));	// Original: (10,  3.38/4)
		q1.getDescription = (amount) => Utils.getMath(getDesc(q1.level));
		q1.getInfo = (amount) => Utils.getMathTo(getInfo(q1.level), getInfo(q1.level + amount));
	}
	
	// q2
	{
		let getDesc = (level) => "q_2=2^{" + level + "}";
		let getInfo = (level) => "q_2=" + getQ2(level).toString(0);
		q2 = theory.createUpgrade(1, currency, new ExponentialCost(1000, 10));	// Original: (1000, 3.38*3)
		q2.getDescription = (amount) => Utils.getMath(getDesc(q2.level));
		q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level), getInfo(q2.level + amount));
	}
	
	// n
	{
		let getDesc = (level) => "n=" + level;
		let getInfo = (level) => "n=" + level;
		n = theory.createUpgrade(2, currency, new ExponentialCost(20, 10/3));	// Original: (20, 3.38)
		n.getDescription = (amount) => Utils.getMath(getDesc(n.level));
		n.getInfo = (amount) => Utils.getMathTo(getInfo(n.level), getInfo(n.level + amount));
		n.bought = (_) => updateSineRatio_flag = true;
	}
	
	// c1
	{
		let getDesc = (level) => "c_1=" + getC1(level).toString(0);
		let getInfo = (level) => "c_1=" + getC1(level).toString(0);
		c1 = theory.createUpgrade(3, currency, new ExponentialCost(50, 5));	// Original: (50, 3.38/1.5)
		c1.getDescription = (amount) => Utils.getMath(getDesc(c1.level));
		c1.getInfo = (amount) => Utils.getMathTo(getInfo(c1.level), getInfo(c1.level + amount));
		c1.bought = (_) => updateSineRatio_flag = true;
	}

	// c2
	{
		let getDesc = (level) => "c_2=2^{" + level + "}";
		let getInfo = (level) => "c_2=" + getC2(level).toString(0);
		c2 = theory.createUpgrade(4, currency, new ExponentialCost(1e10, 10 * Math.log2(10)));	// Original: (1e10, 3.38*10)
		c2.getDescription = (amount) => Utils.getMath(getDesc(c2.level));
		c2.getInfo = (amount) => Utils.getMathTo(getInfo(c2.level), getInfo(c2.level + amount));
	}

	///////////////////////
	// Permanent Upgrades
	theory.createPublicationUpgrade(0, currency, 1e8);
	theory.createBuyAllUpgrade(1, currency, 1e16);
	theory.createAutoBuyerUpgrade(2, currency, 1e24);

	///////////////////////
	// Milestone Upgrades
	theory.setMilestoneCost(new CustomCost(lvl => BigNumber.from(lvl < 5 ? 1 + 1.5*lvl : lvl < 6 ? 10 : lvl < 7 ? 14 : 20)));
	// theory.setMilestoneCost(new LinearCost(2.0, 2.0));
	
	// Original: Increase q1 exponent by 0.01 - max level 4
	{
		q1Exp = theory.createMilestoneUpgrade(0, 4);
		q1Exp.description = Localization.getUpgradeIncCustomExpDesc("q_1", "0.02");
		q1Exp.info = Localization.getUpgradeIncCustomExpInfo("q_1", "0.02");
		q1Exp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
	}
	
	// Original: Add the term c2 - max level 1
	{
		c2Term = theory.createMilestoneUpgrade(1, 1);
		c2Term.description = Localization.getUpgradeAddTermDesc("c_2");
		c2Term.info = Localization.getUpgradeAddTermInfo("c_2");
		c2Term.boughtOrRefunded = (_) => {theory.invalidatePrimaryEquation(); updateAvailability(); };
	}
	
	// Original: c1+n --> c1+n/3^(level) - max level 3
	{
		chiDivN = theory.createMilestoneUpgrade(2, 4);
		updateChiDescAndInfo = () => {
			chiDivN.description = Utils.getMathTo("c_1 + n" + (chiDivN.level > 0 ? ("/3^{" + chiDivN.level + "}") : ""), "c_1 + n/3^{" + (chiDivN.level + (chiDivN.level == 4 ? 0 : 1)) + "}");
			chiDivN.info = chiDivN.description;
		}
		chiDivN.boughtOrRefunded = (_) => {theory.invalidateSecondaryEquation(); updateChiDescAndInfo(); updateSineRatio_flag = true;}
		updateChiDescAndInfo();
	}

	updateAvailability();
}

var updateAvailability = () => {
	c2.isAvailable = c2Term.level > 0;
}

var srK_helper = (x) => { let x2 = x*x; return Math.log(x2 + 1/6 + 1/120/x2 + 1/810/x2/x2)/2 - 1; }

// computes πx * Prod{k=1, n, 1-(x/k)^2} / sin(πx) 
// 		= 1 / Prod{k=n+1, infty, 1-(x/k)^2}
//		= Г(n+1+x) * Г(n+1-x) / Г(n+1)^2
//		= Г(n+1+K+x) * Г(n+1+K-x) / (Г(n+1+K)^2 * Prod{k=n+1, n+K, 1-(x/k)^2})
// quickly (O(K), averages for (n,x)=(1157,1157.3184): ~0.25ms for K=1, ~0.35ms for K=5, ~0.43ms for K=10) 
// and with fair accuracy (relative error: <1e-3 for K=0, <1e-6 for K=1, <1e8 for K=5, <1e-10 for K=10)
var sineRatioK = (n, x, K=5) => {
	if (n < 1 || x >= n + 1) return 0;
	let N = n + 1 + K, x2 = x*x,
		L1 = srK_helper(N + x), L2 = srK_helper(N - x), L3 = srK_helper(N),
		result = N * (L1 + L2 - 2*L3) + x * (L1 - L2) - Math.log(1 - x2/N/N)/2;
	for(let k = n + 1; k < N; ++k) result -= Math.log(1 - x2/k/k);
	return BigNumber.from(result).exp();
}

var tick = (elapsedTime, multiplier) => {
	let dt = BigNumber.from(elapsedTime*multiplier);
	let bonus = theory.publicationMultiplier;
	let vq1 = getQ1(q1.level).pow(getQ1Exp(q1Exp.level));
	let vq2 = getQ2(q2.level);
	let vc2 = c2Term.level > 0 ? getC2(c2.level) : BigNumber.ONE;
	
	if (updateSineRatio_flag) {
		let vn = getN(n.level);
		let vc1 = getC1(c1.level);
		chi = BigNumber.PI * vc1 * vn / (vc1 + vn / BigNumber.THREE.pow(BigNumber.from(chiDivN.level))) + BigNumber.ONE;
		S = sineRatioK(n.level, chi.toNumber()/Math.PI);
		updateSineRatio_flag = false;
	}
	let dq = dt * S * vc2;

	q = q + dq.max(BigNumber.ZERO);
	currency.value += bonus * vq1 * vq2 * q * dt;

	theory.invalidateTertiaryEquation();
}

var getInternalState = () => q.toString();

var setInternalState = (state) => {
	let values = state.split(" ");
	if (values.length > 0) q = parseBigNumber(values[0]);
	updateChiDescAndInfo();
	updateSineRatio_flag = true;
}

var postPublish = () => {
	q = BigNumber.ONE;
	updateSineRatio_flag = true;
}

var getPrimaryEquation = () => {
	theory.primaryEquationHeight = 90;
	let result = "\\begin{matrix}"
	result += "\\dot{\\rho}=q_1";
	if (q1Exp.level > 0) result += `^{${1+q1Exp.level*0.02}}`;
	result += "q_2q,\\quad\\dot{q} = "
	if (c2Term.level > 0) result += "c_2\\cdot ";
	result += "\s_n(\\chi)/\\sin(\\chi)\\\\\\\\";
	result += "s_n(x) := x\\cdot\\prod_{k=1}^n\\left(1-\\frac{x}{k\\pi}^{\\ 2}\\right) "
	result += "\\end{matrix}"
	return result;
}

var getSecondaryEquation = () => {
	let result = theory.latexSymbol + "=\\max\\rho^{0.1},\\quad\\chi =\\pi\\cdot\\frac{c_1n}{c_1+n";
	if (chiDivN.level > 0) result += "/3^{" + chiDivN.level + "}";
	result += "}+1";
	return result;
}

var getTertiaryEquation = () => {
	let result = "";

	result += "\\begin{matrix}q=";
	result += q.toString();
	result += ",&\\chi =";
	result += chi.toString(3);
	result += "\\end{matrix}";

	return result;
}

var getPublicationMultiplier = (tau) => tau.isZero ? (sigma / 20) * BigNumber.ONE : (sigma / 20) * (tau.pow(BigNumber.from(1.5)));
var getPublicationMultiplierFormula = (symbol) => "\\left(\\frac{{\\sigma_{t}}}{20}\\right) {" + symbol + "}^{1.5}";
var getTau = () => currency.value.pow(BigNumber.from(0.1));
var getCurrencyFromTau = (tau) => [tau.max(BigNumber.ONE).pow(10), currency.symbol];
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var getN = (level) => BigNumber.from(level);
var getQ1 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);	// Original: (level, 2, 10, 0);
var getQ2 = (level) => BigNumber.TWO.pow(BigNumber.from(level));
var getC1 = (level) => Utils.getStepwisePowerSum(level, 2, 25, 1);	// Original: (level, 2, 50, 1);
var getC2 = (level) => BigNumber.TWO.pow(BigNumber.from(level));
var getQ1Exp = (level) => BigNumber.from(1 + level * 0.02);			// Original: (1 + level * 0.01);

init();
