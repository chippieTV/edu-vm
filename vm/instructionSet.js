/******************************************/
/** Virtual CPU Instruction Set ***********/
/******************************************/
const I_LOAD      = 0xA0
const I_LOADI     = 0xA1
const I_LOADR     = 0xA2
const I_LOADIR    = 0xA3

const I_ADD       = 0xA8
const I_ADDI      = 0xA9
const I_ADDR      = 0xAA
const I_ADDIR     = 0xAB

const I_WRITE     = 0xB8
const I_WRITEI    = 0xB9

const I_CMP       = 0xC0

const I_JMP       = 0xD0
const I_JNZ       = 0xD1
const I_JMPI      = 0xD2

const I_POP       = 0xE0
const I_PUSH      = 0xE1

const I_HALT      = 0xF0

export const instructionNames = {
	'add':   I_ADD,
	'addi':  I_ADDI,
	'load':  I_LOAD,
	'read':  I_LOADI,
	'write': I_WRITE,
	'cmp':   I_CMP,
	'jmp':   I_JMP,
	'jmpi':  I_JMPI,
	'jnz':   I_JNZ,
	'halt':  I_HALT,
	'push':  I_PUSH,
	'pop':   I_POP
}
