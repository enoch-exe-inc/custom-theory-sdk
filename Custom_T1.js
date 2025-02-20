import { ExponentialCost, FirstFreeCost, LinearCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { parseBigNumber, BigNumber } from "../api/BigNumber";
import { theory } from "../api/Theory";
import { game } from "../api/Game";
import { Utils } from "../api/Utils";

var id = "cust_recurrence_relations";
var name = "Ext. Recurrence Relations";
var description = "An extension of the 'Recurrence Relations' theory from the game.";
var authors = "Gilles-Philippe Paillé; enoch_exe_inc";
var version = 2.71;

var rhoN = BigNumber.ZERO;
var rhoNm1 = BigNumber.ZERO;
var rhoNm2 = BigNumber.ZERO;
var rhoNm3 = BigNumber.ZERO;
var time = 0;

var strTickspeed = "\\text{{" + Localization.get("TheoryPanelTickspeed", "}}q_1q_2\\text{{", "}}{0}\\text{{") + "}}";
var strC1C2;
var epsilon = BigNumber.from(1e-8);

var currency;
var q1, q2, c1, c2, c3, c4, c5;
var c1Exp, logTerm, c3Term, c4Term, c5Term, multSig;
var sigma = (game.sigmaTotal / 20);

var init = () => {
	currency = theory.createCurrency();

	///////////////////
	// Regular Upgrades

	// q1 (Tickspeed)
	{
		let getDesc = (level) => "q_1=" + getQ1(level).toString(0);
		q1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(5, Math.log2(2))));
		q1.getDescription = (_) => Utils.getMath(getDesc(q1.level));
		q1.getInfo = (amount) => Utils.getMathTo(getDesc(q1.level), getDesc(q1.level + amount));
		q1.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
	}

	// q2 (Tickspeed)
	{
		let getDesc = (level) => "q_2=2^{" + level + "}";
		let getInfo = (level) => "q_2=" + getQ2(level).toString(0);
		q2 = theory.createUpgrade(1, currency, new ExponentialCost(100, Math.log2(10)));	// Original: (100, Math.log2(10))
		q2.getDescription = (_) => Utils.getMath(getDesc(q2.level));
		q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level), getInfo(q2.level + amount));
		q2.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
	}

	// c1
	{
		let getDesc = (level) => "c_1=" + getC1(level).toString(0);
		c1 = theory.createUpgrade(2, currency, new ExponentialCost(15, Math.log2(2)));		// Original: (15, Math.log2(10))
		c1.getDescription = (_) => Utils.getMath(getDesc(c1.level));
		c1.getInfo = (amount) => Utils.getMathTo(getDesc(c1.level), getDesc(c1.level + amount));
	}

	// c2
	{
		let getDesc = (level) => "c_2=2^{" + level + "}";
		let getInfo = (level) => "c_2=" + getC2(level).toString(0);
		c2 = theory.createUpgrade(3, currency, new ExponentialCost(3000, Math.log2(10)));	// Original: (3000, Math.log2(10));
		c2.getDescription = (_) => Utils.getMath(getDesc(c2.level));
		c2.getInfo = (amount) => Utils.getMathTo(getInfo(c2.level), getInfo(c2.level + amount));
	}

	// c3
	{
		let getDesc = (level) => "c_3=10^{" + level + "}";
		let getInfo = (level) => "c_3=" + getC3(level).toString(0);
		c3 = theory.createUpgrade(4, currency, new ExponentialCost(1e4, 4 * Math.log2(10)));	// Original: (1e4, 4.5 * Math.log2(10))
		c3.getDescription = (_) => Utils.getMath(getDesc(c3.level));
		c3.getInfo = (amount) => Utils.getMathTo(getInfo(c3.level), getInfo(c3.level + amount));
		c3.isAvailable = false;
	}

	// c4
	{
		let getDesc = (level) => "c_4=10^{" + level + "}";
		let getInfo = (level) => "c_4=" + getC4(level).toString(0);
		c4 = theory.createUpgrade(5, currency, new ExponentialCost(1e6, 6 * Math.log2(10)));	// Original: (1e10, 8 * Math.log2(10))
		c4.getDescription = (_) => Utils.getMath(getDesc(c4.level));
		c4.getInfo = (amount) => Utils.getMathTo(getInfo(c4.level), getInfo(c4.level + amount));
		c4.isAvailable = false;
	}

	/* NEW C5 VARIABLE */
	// c5
	{
		let getDesc = (level) => "c_5=10^{" + level + "}";
		let getInfo = (level) => "c_5=" + getC5(level).toString(0);
		c5 = theory.createUpgrade(6, currency, new ExponentialCost(1e12, 12 * Math.log2(10)));
		c5.getDescription = (_) => Utils.getMath(getDesc(c5.level));
		c5.getInfo = (amount) => Utils.getMathTo(getInfo(c5.level), getInfo(c5.level + amount));
		c5.isAvailable = false;
	}
	
	/////////////////////
	// Permanent Upgrades								// Original
	theory.createPublicationUpgrade(0, currency, 1e6);	// 1e10
	theory.createBuyAllUpgrade(1, currency, 1e12);		// 1e13
	theory.createAutoBuyerUpgrade(2, currency, 1e20);	// 1e30

	///////////////////////
	//// Milestone Upgrades			// Original (25, 25) - Gain 1 milestone upgrade per 1e25 of tau
	// Raised back to per 1e25 of tau, but with first cost free to justify the sigma upgrade.
	theory.setMilestoneCost(new LinearCost(0, 2.5));

	{
		c1Exp = theory.createMilestoneUpgrade(0, 4);
		c1Exp.description = Localization.getUpgradeIncCustomExpDesc("c_1", "0.2");
		c1Exp.info = Localization.getUpgradeIncCustomExpInfo("c_1", "0.2");
		c1Exp.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
	}

	{
		logTerm = theory.createMilestoneUpgrade(1, 1);
		logTerm.description = Localization.getUpgradeMultCustomDesc("c_1", "1+\\frac{ln(\\rho_{n})}{100}");
		logTerm.info = Localization.getUpgradeMultCustomInfo("c_1", "1+\\frac{\\ln(\\rho_{n})}{100}");
		logTerm.boughtOrRefunded = (_) => theory.invalidatePrimaryEquation();
	}

	{
		c3Term = theory.createMilestoneUpgrade(2, 1);
		c3Term.description = Localization.getUpgradeAddTermDesc("\\rho_{n-1}^{0.2}");
		c3Term.info = Localization.getUpgradeAddTermInfo("\\rho_{n-1}^{0.2}");
		c3Term.boughtOrRefunded = (_) => { theory.invalidatePrimaryEquation(); updateAvailability(); };
		c3Term.canBeRefunded = (_) => c4Term.level == 0;
	}

	{
		c4Term = theory.createMilestoneUpgrade(3, 1);
		c4Term.description = Localization.getUpgradeAddTermDesc("\\rho_{n-2}^{0.3}");
		c4Term.info = Localization.getUpgradeAddTermInfo("\\rho_{n-2}^{0.3}");
		c4Term.boughtOrRefunded = (_) => { theory.invalidatePrimaryEquation(); updateAvailability(); };
		c4Term.canBeRefunded = (_) => c5Term.level == 0;
		c4Term.isAvailable = false;
	}
	
	{
		c5Term = theory.createMilestoneUpgrade(4, 1);
		c5Term.description = Localization.getUpgradeAddTermDesc("\\rho_{n-3}^{0.4}");
		c5Term.info = Localization.getUpgradeAddTermInfo("\\rho_{n-3}^{0.4}");
		c5Term.boughtOrRefunded = (_) => { theory.invalidatePrimaryEquation(); updateAvailability(); };
		c5Term.isAvailable = false;
	}
	
	{
		multSig = theory.createMilestoneUpgrade(5, 3);
		multSig.description = Localization.getUpgradeIncCustomExpDesc("\\left(\\frac{{\\sigma_{t}}}{20}\\right)", "1");
		multSig.info = Localization.getUpgradeIncCustomExpInfo("\\left(\\frac{{\\sigma_{t}}}{20}\\right)", "1");
	}

	updateAvailability();
}

var updateAvailability = () => {
	c3.isAvailable = c3Term.level > 0;
	c4.isAvailable = c4Term.level > 0;
	c5.isAvailable = c5Term.level > 0 && c4Term.level > 0;
	c4Term.isAvailable = c3Term.level > 0;
	c5Term.isAvailable = c4Term.level > 0 && c3Term.level > 0;
}

var tick = (elapsedTime, multiplier) => {
	let tickspeed = getTickspeed();

	if (tickspeed.isZero)
		return;

	let timeLimit = 1 / tickspeed.Min(BigNumber.TEN).toNumber();
	time += elapsedTime;

	if (time >= timeLimit - 1e-8) {
		let tickPower = tickspeed * BigNumber.from(time * multiplier);
		
		rhoNm3 = rhoNm2;
		rhoNm2 = rhoNm1;
		rhoNm1 = rhoN;
		rhoN = currency.value;
		let bonus = theory.publicationMultiplier;
		let vc1 = getC1(c1.level).pow(getC1Exponent(c1Exp.level));
		let vc2 = getC2(c2.level);
		let vc3 = getC3(c3.level);
		let vc4 = getC4(c4.level);
		let vc5 = getC5(c5.level);

		let term1 = vc1 * vc2 * (logTerm.level > 0 ? BigNumber.ONE + rhoN.Max(BigNumber.ONE).log() / BigNumber.HUNDRED : BigNumber.ONE);
		let term2 = c3Term.level > 0 ? (vc3 * rhoNm1.pow(0.2)) : BigNumber.ZERO;
		let term3 = c4Term.level > 0 ? (vc4 * rhoNm2.pow(0.3)) : BigNumber.ZERO;
		let term4 = c5Term.level > 0 ? (vc5 * rhoNm3.pow(0.4)) : BigNumber.ZERO;

		strC1C2 = getC1C2().toString();
		
		// rhoN + (bonus * tickPower * (term1 + term2 + term3 + term4) + epsilon);
		currency.value = rhoN + (bonus * tickPower * (term1 + term2 + term3 + term4) + epsilon);

		time = 0;
		theory.invalidateTertiaryEquation();
	}
}

var getInternalState = () => `${rhoN} ${rhoNm1} ${rhoNm2} ${rhoNm3} ${time}`

var setInternalState = (state) => {
	let values = state.split(" ");
	if (values.length > 0) rhoN = parseBigNumber(values[0]);
	if (values.length > 1) rhoNm1 = parseBigNumber(values[1]);
	if (values.length > 2) rhoNm2 = parseBigNumber(values[2]);
	if (values.length > 3) rhoNm3 = parseBigNumber(values[3]);
	if (values.length > 4) time = parseFloat(values[4]);
}

var getPrimaryEquation = () => {
	let result = "\\rho_{n+1} = \\rho_{n}+c_1";

	if (c1Exp.level > 0) result += "^{" + getC1Exponent(c1Exp.level).toString(1) + "}";

	result += "c_2";

	if (logTerm.level > 0) result += "\\left(1+\\frac{\\ln(\\rho_n)}{100}\\right)";
	if (c3Term.level > 0) result += "+c_3\\rho_{n-1}^{0.2}";
	if (c4Term.level > 0) result += "+c_4\\rho_{n-2}^{0.3}";
	if (c5Term.level > 0) result += "+c_5\\rho_{n-3}^{0.4}";

	if (logTerm.level > 0 && c3Term.level > 0 && c4Term.level > 0)
		theory.primaryEquationScale = 0.75;
	else
		theory.primaryEquationScale = 0.95;
 
	return result;
}

var getSecondaryEquation = () => theory.latexSymbol + "=\\max\\rho^{0.1}";
var getTertiaryEquation = () => {
	let result = "\\begin{matrix} c_{1}c_{2} = ";
	result += strC1C2;
	result += ",\\\\";
	result += Localization.format(strTickspeed, getTickspeed().toString(0));
	result += "\\end{matrix}";

	return result;
}

var getPublicationMultiplier = (tau) => tau.isZero ? (BigNumber.ONE * sigma.pow(getSig(multSig.level))) : (tau * sigma.pow(getSig(multSig.level)));	// Original: tau.pow(0.164) / BigNumber.THREE
var getPublicationMultiplierFormula = (symbol) => {
	let formula = "\\left(\\frac{{\\sigma_{t}}}{20}\\right)";
	
	if (multSig.level == 0)	return symbol;
	if (multSig.level == 1) formula += "^{1}";
	if (multSig.level == 2) formula += "^{2}";
	if (multSig.level == 3) formula += "^{3}";
	
	return formula += "{" + symbol + "}";
	
	// "\\left(\\frac{{\\sigma_{t}}}{20}\\right)^{" + getSig(multSig.level).toString() + "} {" + symbol + "}";	// Original: "\\frac{{" + symbol + "}^{0.15}}{2}";
}

var getTau = () => currency.value.pow(0.1);
var getCurrencyFromTau = (tau) => [tau.max(BigNumber.ONE).pow(10), currency.symbol];
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var postPublish = () => {
	time = 0;
	rhoN = BigNumber.ZERO;
	rhoNm1 = BigNumber.ZERO;
	rhoNm2 = BigNumber.ZERO;
	rhoNm3 = BigNumber.ZERO;
	theory.invalidateTertiaryEquation();
}

var getQ1 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getQ2 = (level) => BigNumber.TWO.pow(level);
var getC1 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 1);
var getC1Exponent = (level) => BigNumber.from(1 + (0.2 * level));
var getC2 = (level) => BigNumber.TWO.pow(level);
var getC3 = (level) => BigNumber.TEN.pow(level);
var getC4 = (level) => BigNumber.TEN.pow(level);
var getC5 = (level) => BigNumber.TEN.pow(level);
var getSig = (level) => BigNumber.from(level);
var getTickspeed = () => getQ1(q1.level) * getQ2(q2.level);
var getC1C2 = () => getC1(c1.level).pow(getC1Exponent(c1Exp.level)) * getC2(c2.level);

init();
