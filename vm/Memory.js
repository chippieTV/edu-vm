/******************************************/
/** Virtual Machine Memory Component ******/
/******************************************/

const Memory = (size) => {
	let memory = []
	let updateCallback = null

  // TODO to allow cleaner module pattern.. do this before/outside return
  // or refactor to class with constructor
	for (let i = 0; i < size; i++) {
    memory.push(0)
	}

	const clear = () => {
    memory.fill(0)
	}

	const get = (address, n) => {
    updateCallback(address, false)
    if (typeof n == 'undefined') return memory[address]
    return memory.slice(address, address + n)
	}

	const set = (address, value) => {
    memory[address] = value
    if (updateCallback !== null) {
		  updateCallback(address, true)
    }
	}

	const updated = (f) => {
    updateCallback = f
	}

	const load = (disk) => {
    let contents = disk.contents()
    for (let i = 0; i < size && i < contents.length; i++) {
		  memory[i] = contents.charCodeAt(i) & 0xFF
	  }
	  if (updateCallback !== null) {
		  updateCallback()
    }
	}
	return {
    clear: clear,
    size: size,
    get: get,
    set: set,
    memory: memory,
    load: load,
    updated: updated
	}
}

export default Memory
