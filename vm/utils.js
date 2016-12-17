/******************************************/
/** Generic Utility Functions *************/
/******************************************/
/**
 * Generate an array containing the integers in the interval [i, j).
 */
export const range = (i, j) => {
	let a = []
	for (; i < j; i++) {
    a.push(i)
	}
	return a
}
/**
 * "tack" a value onto the front of an array and returning the
 * array.
 */
export const tack = (e, a) => {
	a.unshift(e)
	return a
}
/**
 * Force a function to be unary
 * i.e. pass none but the first argument
 */
export const unary = (f) => {
	return (a) => {
	  return f(a)
	}
}

// is hex built in in ES6? TODO
export const toHex = (k, ox) => {
	if (typeof ox == 'undefined') ox = false;
	return (n) => {
    let h = Number(n).toString(16)
    while (h.length < k) {
		  h = '0' + h
	  }
	  h = h.toUpperCase()
    if (ox) {
		  h = '0x' + h
	  }
	  return h
	}
}

export const trace = (s) => {
	console.log(s)
	return s
}
