$(function() {
    /** DOM utility functions *****************/
    var H = (function() {
	function mkf(t) {
	    return function() {
		var e = $(document.createElement(t));
		for (i in arguments) {
		    e.append(arguments[i]);
		}
		return e;
	    };
	}

	var h = {};

	var el = ['div', 'textarea', 'button', 'br', 'tr', 'td', 'th', 'table', 'a', 'p'];
	for (j in el) {
	    h[el[j]] = mkf(el[j]);
	}

	return h;
    })();

    function click(h, e) {
	e.on('click', h);
	return e;
    }
    function change(h, e) {
	e.on('change', h);
	return e;
    }
    function cl(c, e) {
	e.addClass(c);
	return e;
    }
    function at(a, v, e) {
	e.attr(a, v);
	return e;
    }

    /** Parser Combinators ********************/
    var EOF = null;
    var debug = {ultra: false};

    // Creates a stream object, which represents the current parsing state.
    function mkStream(input) {
        var I = {};
        var pos = 0;

        I.error = null;
        I.consumed = null;
	I.data = null;

	// Returns the next available character from the input stream,
	// or EOF if there is none.
        I.ch = function() {
	    if (input.length < 1) {
		return EOF;
	    }
            return input[pos];
        };

	// Returns a copy of this stream, with error condition set to
	// the provided value.
        I.raise = function(error) {
            var s = mkStream(input);
            s.error = error;
	    if (debug.ultra) {
		console.log("failed to consume anything from [" + input + "]: " + error);
	    }
            return s;
        };

	// Returns a copy of this stream after consuming n characters
	// and setting the data property to the provided value.
        I.consume = function(n, data) {
	    if (typeof data === "undefined") data = null;
            var s = mkStream(input.slice(n));
            s.consumed = input.slice(0, n);
	    s.data = data;
	    if (debug.ultra) {
		console.log("consumed [" + s.consumed + "] from [" + input + "], leaving [" + s.string() + "]");
	    }
            return s;
        };

	// Returns the entire input stream as a string.
        I.string = function() {
            return input;
        };

	// Returns the value of this stream, defined as the data
	// property if it is non-null, or the text that was consumed
	// in the creation of this stream.
	I.value = function() {
	    if (I.data !== null) {
		return I.data;
	    } else if (I.consumed !== null && I.consumed.length > 0) {
		return I.consumed;
	    }
	    return null;
	}

        return I;
    }

    // Returns a parser that accepts the single character provided.
    function c(expected) {
        return function(stream) {
            v = stream.ch();
            if (v !== expected) {
                return stream.raise('expected "' + expected + '", got "' + v + '"');
            }
            return stream.consume(1);
        };
    }

    // Returns a parser that accepts the provided string.
    function str(expected) {
        return function(stream) {
            if (stream.string().startsWith(expected)) {
                return stream.consume(expected.length);
            }
            return stream.raise('expected "' + expected + '", got "' + stream.string().slice(0, expected.length) + '"');
        };
    }

    // Returns a parser that accepts the given regular expression.
    function r(ex) {
        var re = new RegExp('^' + ex);
        return function(stream) {
            var result = re.exec(stream.string());
            if (result === null) {
                return stream.raise('expected regex "' + ex + '" from "' + stream.string() + '"');
            }

            return stream.consume(result[0].length);
        }
    }

    // Returns a parser that consumes any text accepted by the
    // provided parser. If the provided parser fails, or any data is
    // set, the error condition and data are cleared from the stream
    // returned by this parser.
    function ignore(parser) {
	return function(stream) {
	    return parser(stream).consume(0);
	}
    }

    // Returns a parser that applies each parser supplied as an
    // argument, in sequence. If any of the parsers fail, the sequence
    // fails.
    function seq() {
        var parsers = arguments;
        return function(stream) {
            var i;
	    var s = stream;
	    var data = [];
            for (i in parsers) {
                s = parsers[i](s);
                if (s.error !== null) {
                    return s;
                }
		if (s.value() !== null) {
		    data.push(s.value());
		}
            }
	    if (data.length === 1) {
		data = data[0];
	    }
            return s.consume(0, data);
        };
    }

    // Returns a parser that applies each parser supplied as an
    // argument, in sequence. The first parser that succeeds causes
    // the sequence to succeed. If none of the provided parsers
    // succeed, the sequence fails.
    function or() {
        var parsers = arguments;
        return function(stream) {
            var i;
	    var errors = "";
	    var s = stream;
            for (i in parsers) {
                s = parsers[i](stream);
                if (s.error === null) {
                    return s;
                }
		errors += "\n\t" + s.error;
            }
            return stream.raise("or failed: " + errors);
        };
    }

    // Returns a parser that repeatedly applies the provided parser
    // until it fails. This always succeeds, even if the provided
    // parser fails on the first invocation.
    function any(parser) {
        return function(stream) {
	    var data = [];
            do {
                stream = parser(stream);
		if (stream.value() !== null) {
		    data.push(stream.value());
		}
            } while (stream.error === null);
	    if (data.length === 1) {
		data = data[0];
	    }
            return stream.consume(0, data);
        };
    }

    // Returns a parser that applies the provided parser once, but
    // suppresses any error condition if the provided parser fails.
    function opt(parser) {
        return function(stream) {
            stream = parser(stream);
            return stream.consume(0, stream.value());
        };
    }

    // Returns a parser that applies the provided parser, and if it
    // succeeds, emplaces the provided evaluator in the returned
    // stream's data property.
    function augment(evaluator, parser) {
	return function(stream) {
	    stream = parser(stream);

	    if (stream.error === null) {
		return stream.consume(0, evaluator(stream.value()));
	    }

	    return stream;
	}
    }

    // Tests a parser against provided input.
    function test(pass, parser, input, remaining) {
        var stream = parser(mkStream(input));
        if (stream.error === null !== pass) {
            console.log("----------");
            console.log("input: [" + input + "]");
            console.log("error: [" + stream.error + "]");
            console.log("remaining: [" + stream.string() + "]");
        } else if (stream.string().length > 0) {
	    if (typeof remaining === "undefined") {
		remaining = "";
	    }
	    if (stream.string() != remaining && pass) {
		console.log("Warning: unconsumed input [" + stream.string() + "] from [" + input + "]" );
	    }
	}
	//	console.log(JSON.stringify(stream.value()));

	if (false) {
            var iterations = 100;
            console.time('parse');
            var stream = mkStream(input);
            console.log(input.length * iterations);
            for (var i = 0; i < iterations; i++) {
		parser(mkStream(input));
            }
            console.timeEnd('parse');
            console.time('parse2');
            console.log(input.length * iterations);
            for (var i = 0; i < iterations; i++) {
		JSON.parse(input);
            }
            console.timeEnd('parse2');
	}

        return stream;

    }

    /** Toy Assembly Parser Implementation **/
    var p = {};
    var forward = function(o, p) {
        return function(stream) {
            return o[p](stream);
        };
    };

    var ws                  = ignore(r('[ \r\n\t]*'));

    /** Toy Assembly Language Parser Utilities **/
    var register = r('(C|(PC)|(SP)|(ST))');
    var decimalNumber = augment(numberEvaluator(10), r('[0-9]+'));
    var hexNumber = augment(numberEvaluator(16), r('0x[0-9a-fA-F]+'));
    var number = or(hexNumber, decimalNumber);

    function mustBeArray(data) {
	if (typeof data !== "object") {
	    throw new Error('value of type ' + (typeof data) + ' may not be evaluated as a binary operation');
	}
	if (!('length' in data)) {
	    throw new Error('data must be an array');
	}
    }

    var I_LOAD = 0xA0;
    var I_LOADI = 0xA1;
    var I_LOADR = 0xA2;
    var I_LOADIR = 0xA3;

    var I_ADD = 0xA8;
    var I_ADDI = 0xA9;
    var I_ADDR = 0xAA;
    var I_ADDIR = 0xAB;

    var I_WRITE = 0xB8;
    var I_WRITEI = 0xB9;

    var I_CMP = 0xC0;

    var I_JMP = 0xD0;
    var I_JNZ = 0xD1;
    var I_JMPI = 0xD2;

    var I_POP = 0xE0;
    var I_PUSH = 0xE1;

    var I_HALT = 0xF0;

    var instructionNames = {
	'add': I_ADD,
	'addi': I_ADDI,
	'load': I_LOAD,
	'read': I_LOADI,
	'write': I_WRITE,
	'cmp': I_CMP,
	'jmp': I_JMP,
	'jmpi': I_JMPI,
	'jnz': I_JNZ,
	'halt': I_HALT,
	'push': I_PUSH,
	'pop': I_POP,
    };


    function numberEvaluator(radix) {
	return function(data) {
	    if (typeof data !== "string") {
		throw new Error('value of type ' + (typeof data) + ' may not be evaluated as a number');
	    }
	    return function() {
		return parseInt(data, radix);
	    };
	};
    };
    function instructionEvaluator(data) {
	if (typeof data !== 'object') {
	    return { instruction: instructionNames[data], argument: 0x7e };
	}

	mustBeArray(data);

	if (data.length < 1) {
	    throw new Error('data must have length at least 1');
	}

	if (data.length < 2) {
	    return { instruction: instructionNames[data[0]], argument: 0x7e };
	}
	if (data.length < 3) {
	    var arg = data[1];
	    if (typeof arg !== 'string') {
		arg = arg();
	    }
	    return { instruction: instructionNames[data[0]], argument: arg };
	}

	throw new Error('data must have length at most 2');
    }

    function nullaryInstruction(name) {
	return augment(instructionEvaluator, seq(ws, str(name), ws));
    }
    function unaryInstruction(name) {
	return augment(instructionEvaluator, seq(ws, str(name), ws, or(register, number), ws));
    }

    function registerToIndex(r) {
	switch (r) {
	case 'C':
	    return 0;
	case 'PC':
	    return 1;
	case 'SP':
	    return 2;
	case 'ST':
	    return 3;
	default:
	    return null;
	}
    }

    function indexToRegister(r) {
	switch (r) {
	case 0:
	    return 'C';
	case 1:
	    return 'PC';
	case 2:
	    return 'SP';
	case 3:
	    return 'ST';
	default:
	    return null;
	}
    }

    function compile(disk, memory) {
	var parser = toyAssemblyParser();

	var input = disk.contents();
	var stream = parser(mkStream(input));
        console.log("error: [" + stream.error + "]");
        console.log("remaining: [" + stream.string() + "]");
	var instructions = stream.value();
	if (!('length' in instructions)) {
	    instructions = [instructions];
	}
	console.log("[" + input + "] =>", instructions);

	var arg, command;
	for (var i = 0; i < instructions.length; i++) {
	    command = instructions[i].instruction;
	    arg = instructions[i].argument;

	    if (typeof arg == 'string') {
		if (command == I_LOAD) command = I_LOADR;
		else if (command == I_LOADI) command = I_LOADIR;
		else if (command == I_ADDI) command = I_ADDIR;
		else if (command == I_ADD) command = I_ADDR;
		else {
		    console.log('register reference only allowed for I_LOAD, I_LOADI, and I_ADDI');
		    return;
		}
		var index = registerToIndex(arg);
		if (index === null) {
		    console.log('bad register name ' + arg + ' in ' + command + ' instruction.');
		    return;
		}
		arg = index;
	    }

	    memory.set(i * 2, command);
	    memory.set(i * 2 + 1, arg);
	}
    }

    function toyAssemblyParser() {
	var unaryInstructions = ['addi', 'add', 'loadi', 'load', 'read', 'write', 'cmp', 'jnz', 'jmpi', 'jmp'].map(unaryInstruction);
	var nullaryInstructions = ['halt', 'push', 'pop'].map(nullaryInstruction);
	var anyUnaryInstruction = or.apply(null, unaryInstructions.concat(nullaryInstructions));
	var comment = ignore(seq(ws, c(';'), r('[^\n]+'), c('\n')));

	return any(seq(anyUnaryInstruction, opt(comment)));
    }



    function Memory(size) {
	var memory = [];
	var updateCallback = null;

	for (var i = 0; i < size; i++) {
	    memory.push(0);
	}

	function clear() {
	    memory.fill(0);
	}

	function get(address, n) {
	    if (typeof n == 'undefined') return memory[address];
	    return memory.slice(address, address + n);
	}

	function set(address, value) {
	    memory[address] = value;
	    if (updateCallback !== null) {
		updateCallback(address);
	    }
	}

	function updated(f) {
	    updateCallback = f;
	}

	function load(disk) {
	    var contents = disk.contents();
	    for (var i = 0; i < size && i < contents.length; i++) {
		memory[i] = contents.charCodeAt(i) & 0xFF;
	    }
	    if (updateCallback !== null) {
		updateCallback(null);
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
	};
    }

    function unary(f) {
	return function(a) {
	    return f(a);
	}
    }

    function toHex(k, ox) {
	if (typeof ox == 'undefined') ox = false;
	return function(n) {
	    var h = Number(n).toString(16);
	    while (h.length < k) {
		h = '0' + h;
	    }
	    h = h.toUpperCase();
	    if (ox) {
		h = '0x' + h;
	    }
	    return h;
	}
    }

    function tableHeading(cols, text) {
	return H.tr(at('colspan', cols, H.th(text)));
    }

    function mount(renderable) {
	var el = renderable.render();
	renderable.updated(function() {
	    var newEl = renderable.render();
	    el.replaceWith(newEl);
	    el = newEl;
	});
	return el;
    }

    function Disk() {
	var contents = "INSERT DISK TO CONTINUE";
	var updateCallback = null;
	function read(address) {
	    if (address > contents.length) {
		return 0;
	    }
	    return contents.charCodeAt(address) & 0xFF;
	}

	function write(address, value) {
	    if (address > contents.length) {
		return 0;
	    }
	    contents = contents.substr(0, address) + String.fromCharCode(value & 0xFF) + contents.substr(address + 1, contents.length)

	    if (updateCallback !== null) {
		updateCallback(address);
	    }

	    return 1;
	}

	function _contents(newContents) {
	    if (typeof newContents == 'undefined') {
		return contents;
	    }
	    contents = newContents;
	    if (updateCallback !== null) {
		updateCallback(null);
	    }
	    return contents;
	}
	function updated(f) {
	    updateCallback = f;
	}
	return {
	    read: read,
	    write: write,
	    contents: _contents,
	    updated: updated
	};
    }

    function DiskView(disk) {
	var loadCallback = null;
	function loadDisk() {
	    if (loadCallback !== null) {
		loadCallback();
	    }
	}
	var compileCallback = null;
	function compileDisk() {
	    if (compileCallback !== null) {
		compileCallback();
	    }
	}

	function editDisk() {
	    disk.contents($(this).val());
	}

	function render() {
	    return cl('disk', H.table(H.tr(H.td(click(loadDisk, H.button("Load to memory"))), H.td(click(compileDisk, H.button("Compile to memory")))), H.tr(at('colspan', 2, H.td(at('rows', 25, at('cols', 80, change(editDisk, H.textarea(disk.contents())))))))));
	}

	return { render: render, updated: function(f) { disk.updated(f); }, loadClicked: function(f) { loadCallback = f; }, compileClicked: function(f) { compileCallback = f; } };
    }

    function CPUView(cpu) {
	function render() {
	    return cl('cpu', H.table(tableHeading(6, 'CPU Registers'), H.tr.apply(null, ['A', 'C', 'PC', 'SP', 'ST', 'H'].map(unary(H.th))), H.tr.apply(null, cpu.registers().map(toHex(2)).map(unary(H.td)))));
	}
	return { render: render, updated: function(f) { cpu.updated(f); } };
    }

    function range(i, j) {
	var a = [];
	for (; i < j; i++) {
	    a.push(i);
	}
	return a;
    }
    function tack(e, a) {
	a.unshift(e);
	return a;
    }
    function MemoryView(memory) {
	function render() {
	    var rows = [tableHeading(17, 'Main Memory'), tack(H.th(''), range(0, 16).map(toHex(2)).map(unary(H.th)))];
	    for (var i = 0; i < memory.size; i += 16) {
		rows.push(H.tr.apply(null, tack(H.th(toHex(2)(i / 16)), memory.memory.slice(i, i + 16).map(toHex(2)).map(unary(H.td)))));
	    }
	    return cl('memory', H.table.apply(null, rows));
	}
	return { render: render, updated: function(f) { memory.updated(f); } };
    }

    function FloppyLibrary() {
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
		    click(diskClicked, cl('disk3', H.div('fibonacci 2'))),
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

    function trace(s) {
	console.log(s);
    }

    function CPU(memory) {
	var updateCallback = null;

	var A, C, PC, SP, ST, H;

	function reset() {
	    A = 0;
	    C = 0;
	    PC = 0;
	    SP = 0xFF;
	    ST = 0xFF;
	    H = 0;
	}

	reset();

	function registerValueByIndex(i) {
	    if (i == 0) return C;
	    else if (i == 1) return PC;
	    else if (i == 2) return SP;
	    else if (i == 3) return ST;

	    console.log('bad register index in instruction at address ' + ((PC - 2 + 0xFF) & 0xFF));
	    return 0;
	}

	function step() {
	    if (H)
		return false;

	    var instruction = memory.get(PC, 2);
	    var command = instruction[0];
	    var arg = instruction[1];

	    PC += 2;

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
		break;
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
		    PC = arg;
		    trace('jump to ' + toHex(2, true)(PC))
		} else {
		    trace('no jump to ' + toHex(2, true)(arg));
		}
		break;
	    case I_JMP:
		PC = arg;
		trace('jump to ' + toHex(2, true)(PC))
		break;
	    case I_JMPI:
		PC = memory.get(arg);
		trace('jump to ' + toHex(2, true)(PC))
		break;
	    case I_PUSH:
		memory.set(SP, A);
		v = SP;
		SP = (SP + 0xFF) & 0xFF;
		console.log('push', SP);
		trace('push ' + A + ' onto the stack at ' + toHex(2, true)(v));
		break;
	    case I_POP:
		SP = (SP + 1) & 0xFF;
		console.log('pop', SP);
		A = memory.get(SP);
		trace('pop ' + A + ' off the stack at ' + toHex(2, true)(SP));
		break;
	    default:
		H = 1;
	    }

	    if (updateCallback !== null) {
		updateCallback();
	    }

	    return true;
	}

	function updated(f) {
	    updateCallback = f;
	}
	function registers() {
	    return [A, C, PC, SP, ST, H];
	}

	return {
	    reset: reset,
	    step: step,
	    registers: registers,
	    updated: updated
	};
    }

    var availableDisks = {
	disk0: "load 5    ; this is a comment!\n" +
	    "add 255 write 255\n" +
	    "\n" +
	    "load 238\n" +
	    "write 239\n" +
	    "\n" +
	    "read 239\n" +
	    "write 238\n" +
	    "read 254\n" +
	    "write 239\n" +
	    "\n" +
	    "read 238\n" +
	    "write 237\n" +
	    "read 254\n" +
	    "write 238\n" +
	    "\n" +
	    "read 254\n" +
	    "write 237\n" +
	    "\n" +
	    "read 255 cmp 0 jnz 2\n"+
	    "\nhalt\n",
	disk1: "load 16\nadd 255\npush\ncmp 0\njnz 2\n\nhalt\n",
	disk2: "load 1 \ncmp 0\npush push\nwrite 30 \nload 2\nwrite 31\npush\n\naddi 30 \nwrite 30 \npush \naddi 31 \nwrite 31 \npush \njnz 16",
	disk3: "jmp 2 halt \n"
	    + "load 2 push ; first invocation returns to 2 and halts\n load 0 push ; argument n: produce this fibonacci number\n"
	    + "pop ; get argument (n)\n"
	    + "cmp 0 jnz ISNOTZERO"
	    + "pop write 0x40 ; get return address\n"
	    + "load 1 push ; F0 = 1\n"
	    + "jmpi 0x40 ; return\n"
	    + "cmp 1 jnz ISNOTONE ; (ISNOTZERO)\n"
	    + "pop write 0x40 ; get return address\n"
	    + "load 1 push ; (BASE) F1 = 1\n"
	    + "jmpi 0x40 ; return"
	    + "push ; save argument\n"
	    + "load RET1 push ; push return address\n"
	    + "add 0xFF push ; (ISNOTONE) pass n-1 to first invocation\n"
	    + "jmp FIB ; invoke and leave return value on the stack\n"
	    + "pop write 0x42 ; retrieve return value\n"
	    + "pop write 0x43 ; retrieve argument\n"
	    + "read 0x42 push ; save previous return value\n"
	    + "load RET1 push ; push return address\n"
	    + "read 0x43 add 0xFE push ; (RET1) pass n-2 to second invocation\n"
	    + "jmp FIB ; invoke and leave return value on the stack\n"
	    + "pop write 0x44 ; retrieve Fn-2 (RET2)\n"
	    + "pop addi 0x44 write 0x45 ; retrieve Fn-1 and add it to Fn-2\n"
	    + "pop write 0x40 ; get return address\n"
	    + "read 0x45 push ; push return value\n"
	    + "jmpi 0x40"
	    + ""
	    + ""
	    + ""


    };

    function bootMachine(cpu, disk, memory) {
	return function(label) {
	    if (label in availableDisks) {
		console.log('loading disk', label);
		disk.contents(availableDisks[label]);
		memory.clear();
		compile(disk, memory);
		cpu.reset();
	    } else {
		console.log('no disk');
		disk.contents('DISK ERROR');
	    }
	}
    }

    memory = Memory(256);
    cpu = CPU(memory);
    disk = Disk();
    library = FloppyLibrary(disk);

    library.clicked(bootMachine(cpu, disk, memory));

    diskView = DiskView(disk);
    diskView.compileClicked(function() { compile(disk, memory); });
    diskView.loadClicked(function() { memory.load(disk); });

    $('body').append(cl('row', H.div([MemoryView(memory), diskView, CPUView(cpu), library].map(mount).map(unary(H.div)))));

    compile(disk, memory);

    var interval = setInterval(function() { console.log('tick'); cpu.step(); }, 200);
});
