/* Version comparsion class
 *
 */

var debug = false
function splitChunks(version) {
	// Replacing _ with .
	var v1 = version.replace(/_/g, '.')
	var d = [0]
	var dot = 46, // '.'
		a = 97, // 'a'
		nine = 57 // '9'

	var cur = v[0].charCodeAt(0)
	for (var i = 1; i < v1.length; ++i) {
		var prev = cur
		cur = v1[i].charCodeAt(0)
		if (prev == dot || (cur < a && perv > nine) || perv < a)
			d.push(i)
	}
	return d
}

var ver_weight = {
	'rc': -2,		'pre': -3,		'beta': -4,
	'alpha': -5,	'prealpha': -6,	'git': -7,
	'svn': -7,		'hg': -7,		'r': -7,
	'rev': -7,		'cvs': -7,
}

function getChunk(str, index, chunks) {
	var length = chunks.length
	if (index > length)
		return 0
	var count = (index < length ? chunks[i] : str.length) - chunks[i-1]
	str = str.substr(chunks[i-1], count).replace(/\./g, '')
	if (str in ver_weight)
		return ver_weight[str]
	return str
}

// Returns:
// 1: version1 > version2
// 0: version1 === version2
// -1: version1 < version2
function strverscmp(version1, version2) {
	var d1 = splitChunks(version1)
	var d2 = splitChunks(version2)

	if (debug) {
		console.log("Comparing " + version1 + " vs " + version2)
		console.log("first: " + d1.length + ", second: " + d2.length)
	}

	version1 = version1.replace(/_/g, '.');
	version2 = version2.replace(/_/g, '.');

	var length = d1.length > d2.length ? d1.length : d2.length
	for (var i = 1; i <= length; ++i) {
		var s1 = getChunk(version1, i, d1)
		var s2 = getChunk(version2, i, d2)
		if (debug)
			console.log("Chunk1: " + s1 + "; Chunk2: " + s2)

		if (s1 === s2)
			continue

		// Do not compare different types. String wins
		if (typeof s1 !== typeof s2)
			return typeof s1 === 'string' ? 1 : -1

		return s1 > s2 ? 1 : -1
	}

	return 0;
}


// Condition should be in SQL format (int). Returns true if OK, false if not.
function checkDepCondition(required_version, pkgversion, condition) {
	var result = strverscmp(pkgversion, required_version)
	switch(condition) {
	case 1:
		return result > 0
	case 2:
		return result < 0
	case 3:
		return result === 0
	case 4:
		return result !== 0
	case 5:
		return result >= 0
	case 6:
		return result <= 0
	case 7:
		return true;
	default:
		console.log("Unknown condition: " + condition)
	}
	return false;
}

function getDepCondition(cond) {
	switch(cond) {
	case 1: return '>';
	case 2: return '<';
	case 3: return '==';
	case 4: return '!=';
	case 5: return '>=';
	case 6: return '<=';
	case 7: return 'any';
	}
}

var conditions = ["more", "less", "equal", "notequal", "atleast", "notmore", "any"]

function getDepConditionFromXML(condition) {
	condition = condition.trim()
	if (condition === '(any)')
		return 7
	if (condition in conditions)
		return conditions.indexOf(condition)
	return -1
}

function getDepConditionBack(cond) {
	if (cond < 0 || cond >= conditions.length)
		return cond
	return conditions[cond]
}

module.exports = {
	vercmp: strverscmp,
	condition: getDepCondition,
	conditionCheck: checkDepCondition,
	conditionReverse: getDepConditionBack,
	conditionFromXML: getDepConditionFromXML
}