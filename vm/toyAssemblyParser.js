/******************************************/
/** Toy Assembly Parser Implementation **/
/******************************************/

import { instructionNames } from './instructionSet'

import {
  EOF,
  any,
  augment,
  c,
  ignore,
  mkStream,
  opt,
  or,
  r,
  seq,
  str,
  test
} from './parser'

const toyAssemblyParser = (function() {
	var p = {}
	var forward = function(o, p) {
    return function(stream) {
		  return o[p](stream)
    }
	}

	var ws = ignore(r('[ \r\n\t]*'))

	/** Toy Assembly Language Parser Utilities **/
	var register = r('(C|(PC)|(SP)|(ST))')
	var decimalNumber = augment(numberEvaluator(10), r('[0-9]+'))
	var hexNumber = augment(numberEvaluator(16), r('0x[0-9a-fA-F]+'))
	var number = or(hexNumber, decimalNumber)

	function mustBeArray(data) {
    if (typeof data !== "object") {
		  throw new Error('value of type ' + (typeof data) + ' may not be evaluated as a binary operation')
	  }
    if (!('length' in data)) {
		  throw new Error('data must be an array')
    }
	}


	function numberEvaluator(radix) {
	  return (data) => {
		  if (typeof data !== "string") {
		    throw new Error('value of type ' + (typeof data) + ' may not be evaluated as a number')
		  }
		  return () => {
		    return parseInt(data, radix)
	    }
    }
	}

	function instructionEvaluator(data) {
	  if (typeof data !== 'object') {
		  return { instruction: instructionNames[data], argument: 0x7e }
	  }

	  mustBeArray(data)

	  if (data.length < 1) {
		  throw new Error('data must have length at least 1')
	  }

	  if (data.length < 2) {
		  return { instruction: instructionNames[data[0]], argument: 0x7e }
    }
    if (data.length < 3) {
  		var arg = data[1];
  		if (typeof arg !== 'string') {
		    arg = arg()
  		}
  		return { instruction: instructionNames[data[0]], argument: arg }
    }

    throw new Error('data must have length at most 2')
	}

	function nullaryInstruction(name) {
    console.log('about to augment ', name);
    console.log(instructionEvaluator);
    console.log(seq(ws, str(name), ws));
    console.log(str(name));

    return augment(instructionEvaluator, seq(ws, str(name), ws))
	}

	function unaryInstruction(name) {
    console.log('about to augment ', name);
    return augment(instructionEvaluator, seq(ws, str(name), ws, or(register, number), ws))
	}

	function toyAssemblyParser() {
    console.log('in toyAssemblyParser');
    console.log('about to run unaryInstructions');
    var unaryInstructions = ['addi', 'add', 'loadi', 'load', 'read', 'write', 'cmp', 'jnz', 'jmpi', 'jmp'].map(unaryInstruction)
    console.log(unaryInstructions);
    console.log('about to run nullaryInstructions');
    var nullaryInstructions = ['halt', 'push', 'pop'].map(nullaryInstruction)
    console.log(nullaryInstructions);

    var anyUnaryInstruction = or.apply(null, unaryInstructions.concat(nullaryInstructions))
    var comment = ignore(seq(ws, c(';'), r('[^\n]+'), c('\n')))

    return any(seq(anyUnaryInstruction, opt(comment)))
	}

	return toyAssemblyParser()
})()

export default toyAssemblyParser
