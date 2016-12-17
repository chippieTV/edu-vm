import {
  range,
  tack,
  unary,
  toHex,
  trace
} from './utils'

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

import { compile } from './AssemblyCompiler'
import toyAssemblyParser from './toyAssemblyParser'
import { availableDisks } from './programs/availableDisks'

import CPU from './CPU'
import Disk from './Disk'
import Memory from './Memory'

// replace view with React
import {
  CPUView,
  MemoryView,
  DiskView,
  FloppyLibrary
} from './view/VMDisplay'


/******************************************/
/** main **********************************/
/******************************************/
function main() {
	let memory = Memory(256)
	let cpu = CPU(memory)
	let disk = Disk()
	let library = FloppyLibrary(disk)

	const bootMachine = (cpu, disk, memory) => {
    return (label) => {
  		if (label in availableDisks) {
  	    console.log('loading disk', label)
  	    disk.contents(availableDisks[label])
  	    memory.clear()
  	    compile(disk, memory)
  	    cpu.reset()
  		} else {
  	    console.log('no disk')
  	    disk.contents('DISK ERROR')
  	  }
    }
  }

	library.clicked(bootMachine(cpu, disk, memory))

	let diskView = DiskView(disk)
	diskView.compileClicked(function() { compile(disk, memory) })
	diskView.loadClicked(function() { memory.load(disk) })


// TODO stop rendering.. rewrite this in react..
  // document.querySelector('body').appendChild(cl('row', H.div([MemoryView(memory), CPUView(cpu), diskView, library].map(mount).map(unary(H.div)))));
	// $('body').append(cl('row', H.div([MemoryView(memory), CPUView(cpu), diskView, library].map(mount).map(unary(H.div)))));

	compile(disk, memory)

	let interval = setInterval(function() { /*console.log('tick');*/ cpu.step(); }, 4800)

    // window.addEventListener('keyup', (e) => {
    //     switch(e.keyCode) {
    //         case '39': // right arrow
    //         cpu.step()
    //         break
    //
    //
    //
    //     }
    //     console.log(e.keyCode == 39)
    // })
}

main()
