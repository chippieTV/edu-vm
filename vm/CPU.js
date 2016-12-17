/******************************************/
/** Virtual Machine CPU Component *********/
/******************************************/

import {
  range,
  tack,
  unary,
  toHex,
  trace
} from './utils'


const CPU = (memory) => {
	let updateCallback = null

	let A, C, PC, SP, ST, H

	const reset = () => {
    A = 0;
    C = 0;
    PC = 0;
    SP = 0xFF;
    ST = 0xFF;
    H = 0;
	}

	reset()

	const registerValueByIndex = (i) => {
    if (i == 0) return C
    else if (i == 1) return PC
    else if (i == 2) return SP
    else if (i == 3) return ST

    console.log('bad register index in instruction at address ' + ((PC - 2 + 0xFF) & 0xFF))
    H = 1
    return 0
	}

	const indexToRegister = (r) => {
	  switch (r) {
	    case 0:
		    return 'C'
	    case 1:
		    return 'PC'
	    case 2:
		    return 'SP'
	    case 3:
		    return 'ST'
	    default:
		    return null
	  }
	}

	const step = () => {
	  if (H) return false

    var instruction = memory.get(PC, 2)
    var command = instruction[0]
    var arg = instruction[1]

    PC += 2

    var v;
    switch (command) {
      case I_ADD:
    		v = (A + arg) & 0xFF;
    		trace('add ' + arg + ' to A ('+A+') to get ' + v);
    		A = v;
    		break;
  	  case I_ADDR:
    		v = registerValueByIndex(arg);
    		v = (A + v) & 0xFF;
    		trace('add register ' + indexToRegister(arg) + ' to A ('+A+') to get ' + v);
    		A = v;
    		break;
  	  case I_ADDI:
    		v = (A + memory.get(arg)) & 0xFF;
    		trace('add ' + arg + ' to A ('+A+') to get ' + v);
    		A = v;
    		break;
  	  case I_ADDIR:
    		v = registerValueByIndex(arg);
    		v = (A + memory.get(v)) & 0xFF;
    		trace('add address of register ' + indexToRegister(arg) + ' to A ('+A+') to get ' + v);
    		A = v;
    		break;
	    case I_LOADR:
    		v = registerValueByIndex(arg);
    		trace('set A to ' + v + ' from register ' + indexToRegister(arg));
    		A = v;
    		break
	    case I_LOAD:
    		v = arg & 0xFF;
    		trace('set A to ' + v);
    		A = v;
    		break;
	    case I_LOADIR:
    		var addr = registerValueByIndex(arg);
    		v = memory.get(addr);
    		A = v;
    		trace('set A to ' + v + ' from memory address ' + toHex(2, true)(addr));
    		break;
	    case I_LOADI:
    		v = memory.get(arg);
    		A = v;
    		trace('set A to ' + v + ' from memory address ' + toHex(2, true)(arg));
    		break;
	    case I_WRITE:
    		memory.set(arg, A);
    		trace('write ' + A + ' to memory address ' + toHex(2, true)(arg));
    		break;
	    case I_CMP:
    		C = A < arg ? 0xFF : (A > arg ? 1 : 0);
    		trace('compare ' + A + ' to ' + arg + ': ' + C);
    		break;
	    case I_JNZ:
    		if (C) {
  		    PC = arg
  		    trace('jump to ' + toHex(2, true)(PC))
    		} else {
  		    trace('no jump to ' + toHex(2, true)(arg))
    		}
    		break
	    case I_JMP:
    		PC = arg
    		trace('jump to ' + toHex(2, true)(PC))
    		break
	    case I_JMPI:
    		PC = memory.get(arg)
    		trace('jump to ' + toHex(2, true)(PC))
    		break
	    case I_PUSH:
    		memory.set(SP, A)
    		v = SP
    		SP = (SP + 0xFF) & 0xFF
    		console.log('push', SP)
    		trace('push ' + A + ' onto the stack at ' + toHex(2, true)(v))
		    break
	    case I_POP:
    		SP = (SP + 1) & 0xFF
    		console.log('pop', SP)
    		A = memory.get(SP)
    		trace('pop ' + A + ' off the stack at ' + toHex(2, true)(SP))
		    break
	    default:
    		H = 1;
    		console.log('bad instruction at address ' + ((PC - 2 + 0xFF) & 0xFF));
    		break;
    }

    if (updateCallback !== null) {
	    updateCallback()
    }

    return true
	}

	const updated = (f) => {
    updateCallback = f
	}

	const registers = () => {
    return [A, C, PC, SP, ST, H]
	}

	return {
    reset: reset,
    step: step,
    registers: registers,
    updated: updated
	}
}

export default CPU
