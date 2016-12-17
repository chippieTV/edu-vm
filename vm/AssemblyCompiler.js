/******************************************/
/** Assembly Compiler *********************/
/******************************************/

import { mkStream } from './parser'

import toyAssemblyParser from './toyAssemblyParser'


export const compile = (disk, memory) => {
  const registerToIndex = (r) => {
    switch (r) {
      case 'C':
        return 0
      case 'PC':
        return 1
      case 'SP':
        return 2
      case 'ST':
        return 3
      default:
        return null
    }
  }

  let parser = toyAssemblyParser

  let input = disk.contents()
  let stream = parser(mkStream(input))
  console.log("error: [" + stream.error + "]")
  console.log("remaining: [" + stream.string() + "]")
  let instructions = stream.value()
  if (!('length' in instructions)) {
    instructions = [instructions]
  }
  console.log("[" + input + "] =>", instructions)

  let arg, command
  for (let i = 0; i < instructions.length; i++) {
    command = instructions[i].instruction
    arg = instructions[i].argument

    if (typeof arg == 'string') {
      if (command == I_LOAD) command = I_LOADR
      else if (command == I_LOADI) command = I_LOADIR
      else if (command == I_ADDI) command = I_ADDIR
      else if (command == I_ADD) command = I_ADDR
      else {
        console.log('register reference only allowed for I_LOAD, I_LOADI, and I_ADDI')
        return
      }
      var index = registerToIndex(arg)
      if (index === null) {
        console.log('bad register name ' + arg + ' in ' + command + ' instruction.')
        return
      }
      arg = index
    }

    memory.set(i * 2, command)
    memory.set(i * 2 + 1, arg)
  }
}
