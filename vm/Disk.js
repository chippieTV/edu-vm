/******************************************/
/** Virtual Machine Disk Component ********/
/******************************************/

const Disk = () => {
	let contents = "INSERT DISK TO CONTINUE";
	let updateCallback = null;
	const read = (address) => {
	  if (address > contents.length) {
		  return 0
	  }
	  return contents.charCodeAt(address) & 0xFF
	}

	const write = (address, value) => {
    if (address > contents.length) {
		  return 0
	  }
	  contents = contents.substr(0, address) + String.fromCharCode(value & 0xFF) + contents.substr(address + 1, contents.length)

    if (updateCallback !== null) {
		  updateCallback(address)
	  }

	  return 1
	}

	function _contents(newContents) {
    if (typeof newContents == 'undefined') {
		  return contents
    }
    contents = newContents
    if (updateCallback !== null) {
		  updateCallback(null)
    }
    return contents;
	}
	function updated(f) {
    updateCallback = f
	}
	return {
    read: read,
    write: write,
    contents: _contents,
    updated: updated
	}
}

export default Disk
