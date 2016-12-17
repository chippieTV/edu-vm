/******************************************/
/** Virtual Machine Display Components ****/
/******************************************/

import {
  H,
  click,
  change,
  cl,
  at,
  tableHeading,
  mount } from './DOM'


export const CPUView = (cpu) => {
	function render() {
    return cl('cpu', H.table(tableHeading(6, 'CPU Registers'), H.tr.apply(null, ['A', 'C', 'PC', 'SP', 'ST', 'H'].map(unary(H.th))), H.tr.apply(null, cpu.registers().map(toHex(2)).map(unary(H.td)))));
	}
	return { render: render, updated: function(f) { cpu.updated(f); } };
}

export const MemoryView = (memory) => {
	function colorTD(clazz, f) {
    return function(v) {
		  return cl(clazz, f(v));
	  }
	}

	const atOffset = (offset, f1, f2) => {
	  return (v, i) => {
		  return i == offset ? f1(v) : f2(v)
	  }
	}

	function render(updated_address, is_write) {
	  if (typeof updated_address == 'undefined') {
		  updated_address = -1;
		  is_write = false;
	  }
    var rows = [tableHeading(17, 'Main Memory'), H.tr(tack(H.th(''), range(0, 16).map(toHex(2)).map(unary(H.th))))];

    var highlighter = atOffset(updated_address % 16, colorTD(is_write ? 'memory-written' : 'memory-read', H.td), H.td);

    for (var i = 0; i < memory.size; i += 16) {
  		var ff = updated_address >= i && updated_address < i + 16 ? highlighter : unary(H.td);
  		rows.push(H.tr.apply(null, tack(H.th(toHex(2)(i)), memory.memory.slice(i, i + 16).map(toHex(2)).map(ff))));
  	}
    return cl('memory', H.table.apply(null, rows));
  }
	return { render: render, updated: function(f) { memory.updated(f); } };
}

export const DiskView = (disk) => {
	var loadCallback = null
	function loadDisk() {
    if (loadCallback !== null) {
		  loadCallback();
	  }
	}
	var compileCallback = null
	function compileDisk() {
    if (compileCallback !== null) {
		  compileCallback();
	  }
	}

	const editDisk = () => {
    console.log('editDisk commented out for jQuery');
    console.log(disk);
    console.log(this);
    // disk.contents($(this).val())
	}

	function render() {
    return cl('disk', H.table(H.tr(H.td(click(loadDisk, H.button("Load to memory"))), H.td(click(compileDisk, H.button("Compile to memory")))), H.tr(at('colspan', 2, H.td(at('rows', 25, at('cols', 80, change(editDisk, H.textarea(disk.contents())))))))));
	}

	return { render: render, updated: function(f) { disk.updated(f); }, loadClicked: function(f) { loadCallback = f; }, compileClicked: function(f) { compileCallback = f; } };
}

export const FloppyLibrary = () => {
	var clickHandler = null;
	function diskClicked() {
    if (clickHandler !== null) {
		  clickHandler($(this).attr('class'))
	  }
	}
	function render() {
	  return cl('library', H.div(
  		cl('head', H.div('Insert disk?')),
  		cl('list', H.div(
		    click(diskClicked, cl('disk0', H.div('simple loop'))),
		    click(diskClicked, cl('disk1', H.div('stack test'))),
		    click(diskClicked, cl('disk2', H.div('fibonacci sequence'))),
		    click(diskClicked, cl('disk3', H.div('really simple'))),
		    click(diskClicked, cl('disk4', H.div('letters, \'87'))),
		    click(diskClicked, cl('disk5', H.div('addresses'))),
		    click(diskClicked, cl('disk6', H.div('recipe collection'))),
		    click(diskClicked, cl('disk7', H.div('summer \'88 vacation itinerary'))),
		    click(diskClicked, cl('disk8', H.div('stack test'))),
		    click(diskClicked, cl('disk9', H.div('porn')))
		  ))
	  ));
	}
	return { render: render, updated: function(){}, clicked: function(f) { clickHandler = f; } };
}
