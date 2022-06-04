import { ExponentialCost, FirstFreeCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { parseBigNumber, BigNumber } from "../api/BigNumber";
import { theory } from "../api/Theory";
import { game } from "../api/Game";
import { Utils } from "../api/Utils";

var id = "cust_polynomials_sigmatest"
var name = "Ext. Polynomials²";
var description = "An extension of the implementation of the 'Polynomials' theory from the game.";
var authors = "Gilles-Philippe Paillé; enoch_exe_inc";
var version = 1;

var q = BigNumber.ZERO;
var q1, q2;
var c1, c2, c3, c4, c5, c6;
var terms, c1Exp, multQDot;
var sig1, sig2;
var sigma = game.sigmaTotal;

var init = () => {
	currency = theory.createCurrency();

	///////////////////
	// Regular Upgrades - Costs modified by about 2%

	// c1
	{
		let getDesc = (level) => "c_1=" + getC1(level).toString(0);
		c1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(5, Math.log2(1.3))));	// Original: (5, Math.log2(1.305));
		c1.getDescription = (amount) => Utils.getMath(getDesc(c1.level));
		c1.getInfo = (amount) => Utils.getMathTo(getDesc(c1.level), getDesc(c1.level + amount));
	}

	// c2
	{
		let getDesc = (level) => "c_2=2^{" + level + "}";
		let getInfo = (level) => "c_2=" + getC2(level).toString(0);
		c2 = theory.createUpgrade(1, currency, new ExponentialCost(20, Math.log2(3.725)));		// Original: (20, Math.log2(3.75)); (3.676)
		c2.getDescription = (amount) => Utils.getMath(getDesc(c2.level));
		c2.getInfo = (amount) => Utils.getMathTo(getInfo(c2.level), getInfo(c2.level + amount));
	}

	// c3
	{
		let getDesc = (level) => "c_3=2^{" + level + "}";
		let getInfo = (level) => "c_3=" + getC3(level).toString(0);
		c3 = theory.createUpgrade(2, currency, new ExponentialCost(1000, Math.log2(2.4)));		// Original: (2000, Math.log2(2.468)); (2.42)
		c3.getDescription = (amount) => Utils.getMath(getDesc(c3.level));
		c3.getInfo = (amount) => Utils.getMathTo(getInfo(c3.level), getInfo(c3.level + amount));
	}

	// c4
	{
		let getDesc = (level) => "c_4=3^{" + level + "}";
		let getInfo = (level) => "c_4=" + getC4(level).toString(0);
		c4 = theory.createUpgrade(3, currency, new ExponentialCost(5e3, Math.log2(4.75)));		// Original: (1e4, Math.log2(4.85)); (4.755)
		c4.getDescription = (amount) => Utils.getMath(getDesc(c4.level));
		c4.getInfo = (amount) => Utils.getMathTo(getInfo(c4.level), getInfo(c4.level + amount));
		c4.isAvailable = false;
	}

	// c5
	{
		let getDesc = (level) => "c_5=5^{" + level + "}";
		let getInfo = (level) => "c_5=" + getC5(level).toString(0);
		c5 = theory.createUpgrade(4, currency, new ExponentialCost(5e7, Math.log2(12.25)));		// Original: (1e8, Math.log2(12.5)); (12.255)
		c5.getDescription = (amount) => Utils.getMath(getDesc(c5.level));
		c5.getInfo = (amount) => Utils.getMathTo(getInfo(c5.level), getInfo(c5.level + amount));
		c5.isAvailable = false;
	}

	// c6
	{
		let getDesc = (level) => "c_6=10^{" + level + "}";
		let getInfo = (level) => "c_6=" + getC6(level).toString(0);
		c6 = theory.createUpgrade(5, currency, new ExponentialCost(5e9, Math.log2(56.4)));		// Original: (1e10, Math.log2(58)); (56.863)
		c6.getDescription = (amount) => Utils.getMath(getDesc(c6.level));
		c6.getInfo = (amount) => Utils.getMathTo(getInfo(c6.level), getInfo(c6.level + amount));
		c6.isAvailable = false;
	}

	// q1
	{
		let getDesc = (level) => "q_1=" + getQ1(level).toString(0);
		let getInfo = (level) => "q_1=" + getQ1(level).toString(0);
		q1 = theory.createUpgrade(6, currency, new ExponentialCost(10, 6));
		q1.getDescription = (amount) => Utils.getMath(getDesc(q1.level));
		q1.getInfo = (amount) => Utils.getMathTo(getInfo(q1.level), getInfo(q1.level + amount));
	}

	// q2
	{
		let getDesc = (level) => "q_2=2^{" + level + "}";
		let getInfo = (level) => "q_2=" + getQ2(level).toString(0);
		q2 = theory.createUpgrade(7, currency, new ExponentialCost(1000, 9));
		q2.getDescription = (amount) => Utils.getMath(getDesc(q2.level));
		q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level), getInfo(q2.level + amount));
	}

	/////////////////////
	// Permanent Upgrades								// Original:
	theory.createPublicationUpgrade(0, currency, 1e9);	// 1e9
	theory.createBuyAllUpgrade(1, currency, 1e16);		// 1e13
	theory.createAutoBuyerUpgrade(2, currency, 1e25);	// 1e30

	/////////////////////
	// Milestone Upgrades
	theory.setMilestoneCost(new LinearCost(2.0, 2.0)); // Original: (25, 25)

	// Original: milestone 0, adds polynomial terms, max level 3
	{
		terms = theory.createMilestoneUpgrade(0, 3);
		terms.getDescription = (_) => Localization.getUpgradeAddTermDesc(terms.level == 0 ? "q^2" : terms.level == 1 ? "q^3" : "q^4");
		terms.getInfo = (_) => Localization.getUpgradeAddTermInfo(terms.level == 0 ? "q^2" : terms.level == 1 ? "q^3" : "q^4");
		terms.boughtOrRefunded = (_) => {
			theory.invalidatePrimaryEquation();
			updateAvailability();
		}
	}
	
	// Original: milestone 1, adds exponent of 0.15 to c1 variable, max level 1
	{
		c1Exp = theory.createMilestoneUpgrade(1, 5);
		c1Exp.description = Localization.getUpgradeIncCustomExpDesc("c_1", "0.05");
		c1Exp.info = Localization.getUpgradeIncCustomExpInfo("c_1", "0.05");
		c1Exp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
	}

	// Original: milestone 2, multiplies qdot by 2, max level 3
	{
		multQDot = theory.createMilestoneUpgrade(2, 5);
		multQDot.description = Localization.getUpgradeMultCustomDesc("\\dot{q}", "3");
		multQDot.info = Localization.getUpgradeMultCustomInfo("\\dot{q}", "3");
		multQDot.boughtOrRefunded = (_) => theory.invalidateSecondaryEquation();
	}
	
	/* NEW MILESTONE UPGRADES */
	// × income of theory by (sigmaTotal / 20)^level
	{
		sig1 = theory.createMilestoneUpgrade(3, 1);
		sig1.description = Localization.getUpgradeIncCustomExpDesc("\\left(\\frac{{\\sigma_{t}}}{20}\\right)^{1}", "1");
		sig1.info = Localization.getUpgradeIncCustomExpInfo("\\left(\\frac{{\\sigma_{t}}}{20}\\right)^{1}", "1");
		sig1.isAvailable = false;
	}
	
	updateAvailability();
	
	{
		sig2 = theory.createMilestoneUpgrade(4, 1);
		sig2.description = Localization.getUpgradeIncCustomExpDesc("\\left(\\frac{{\\sigma_{t}}}{20}\\right)^{2}", "2");
		sig2.info = Localization.getUpgradeIncCustomExpInfo("\\left(\\frac{{\\sigma_{t}}}{20}\\right)^{2}", "2");
		sig2.isAvailable = false;
	}
}

var updateAvailability = () => {
	c4.isAvailable = terms.level > 0;
	c5.isAvailable = terms.level > 1;
	c6.isAvailable = terms.level > 2;
	sig1.isAvailable = terms.level > 2;
	sig2.isAvailable = sig1.level > 0;
}

var tick = (elapsedTime, multiplier) => {
	let dt = BigNumber.from(elapsedTime * multiplier);
	let vq1 = getQ1(q1.level);
	let vq2 = getQ2(q2.level);
	let vc1 = getC1(c1.level);
	let vc1Exp = getC1Exp(c1Exp.level);
	let vc2 = getC2(c2.level);
	let vc3 = getC3(c3.level);
	let vc4 = getC4(c4.level);
	let vc5 = getC5(c5.level);
	let vc6 = getC6(c6.level);
	let q1q2 = vq1 * vq2;

	let p = (q + BigNumber.ONE).Square() - BigNumber.ONE;
	q = (BigNumber.ONE + p + BigNumber.THREE.pow(1 + multQDot.level) * q1q2 * dt).sqrt() - BigNumber.ONE;
	let qe2 = q * q;
	let qe3 = qe2 * q;
	let qe4 = qe3 * q;

	let term1 = vc1.pow(vc1Exp) * vc2;
	let term2 = vc3 * q;
	let term3 = terms.level > 0 ? vc4 * qe2 : BigNumber.ZERO;
	let term4 = terms.level > 1 ? vc5 * qe3 : BigNumber.ZERO;
	let term5 = terms.level > 2 ? vc6 * qe4 : BigNumber.ZERO;
	let bonus = theory.publicationMultiplier;

	currency.value += bonus * dt * (term1 + term2 + term3 + term4 + term5);

	theory.invalidateTertiaryEquation();
}

var getInternalState = () => `${q}`

var setInternalState = (state) => {
	let values = state.split(" ");
	if (values.length > 0) q = parseBigNumber(values[0]);
}

var postPublish = () => {
	q = BigNumber.ZERO;
}

var getPrimaryEquation = () => {
	let result = "";

	result += "\\dot{\\rho}=c_1";
	
	// Original: if (c1Exp.level == 1) result += "^{1.15}";
	if (c1Exp.level == 1) result += "^{1.05}";
	if (c1Exp.level == 2) result += "^{1.1}";
	if (c1Exp.level == 3) result += "^{1.15}";
	if (c1Exp.level == 4) result += "^{1.2}";
	if (c1Exp.level == 5) result += "^{1.25}";
	
	result += "c_2+c_3q";
	
	if (terms.level > 0) result += "+c_4q^2";
	if (terms.level > 1) result += "+c_5q^3";
	if (terms.level > 2) result += "+c_6q^4";

	return result;
}

var getSecondaryEquation = () => {
	let result = "\\begin{matrix}";

	result += theory.latexSymbol;
	result += "=\\max\\rho^{0.1},&\\dot{q}=";
	if (multQDot.level > 0)
	{
		result += "3";
		if (multQDot.level > 1)
			result += "^{" + multQDot.level.toString() + "}";
	}
	result += "q_1q_2/(1+q)";
	result += "\\end{matrix}";

	return result;
}

var getTertiaryEquation = () => "q=" + q.toString();

var getPublicationMultiplier = (tau) => tau.isZero ? (sigma / 20) * BigNumber.ONE : (sigma / 20).pow(1 + sig1.level + sig2.level) * tau; // Original: tau.pow(0.165) / BigNumber.FOUR;
var getPublicationMultiplierFormula = (symbol) => "\\left(\\frac{{\\sigma_{t}}}{20}\\right)^{" + (1 + sig1.level + sig2.level).toString() + "} {" + symbol + "}"; // Original: "\\frac{{" + symbol + "}^{0.165}}{4}";
var getTau = () => currency.value.pow(0.1);
var getCurrencyFromTau = (tau) => [tau.max(BigNumber.ONE).pow(10), currency.symbol];
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var getC1 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getC2 = (level) => BigNumber.TWO.pow(level);
var getC3 = (level) => BigNumber.TWO.pow(level);
var getC4 = (level) => BigNumber.THREE.pow(level);
var getC5 = (level) => BigNumber.FIVE.pow(level);
var getC6 = (level) => BigNumber.TEN.pow(level);
var getQ1 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getQ2 = (level) => BigNumber.TWO.pow(level);
var getC1Exp = (level) => BigNumber.from(1 + level * 0.05);
// var getSigma = (level) => BigNumber.from(level);

init();
