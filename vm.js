$(function() {
    /******************************************/
    /** Generic Utility Functions *************/
    /******************************************/
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
    /** Force a function to be unary
      * i.e. pass none but the first argument
      */
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
    function trace(s) {
	console.log(s);
	return s;
    }

    /******************************************/
    /** DOM utility functions *****************/
    /******************************************/
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

    /******************************************/
    /** Parsing Stuff *************************/
    /******************************************/
    var EOF = null;
    var debug = {ultra: false};

    /**
     * The functions implemented here are inspired by parser
     * combinator libraries such as parsec for Haskell. The library
     * provides a very small set of fundamental parser generators,
     * along with a larger set of parser combinators.
     *
     * A parser combinator is a function that takes one or more
     * parsers as arguments, and returns a new parser that combines or
     * modifies the behavior of the original parsers.
     *
     * The parsers defined here operate on a stream object, which is
     * similar to (if not exactly deserving of being called) a monad,
     * in that its purpose is to entirely contain the parsing state,
     * so that parsers that operate on it are purely functional.
     *
     * Hence, in order to parse something, one needs to define a
     * parser, create a stream, and then call the parser on the
     * stream. The parser returns a stream that may or may not differ
     * from the stream passed it. Generally, parsers consume
     * characters from the stream, so that the returned stream will
     * contain fewer characters (if the applied parser was
     * successful). Streams have an error property which may be set if
     * a parser fails. Streams also have a value property which, for
     * the fundamental parsers, is set to the string which the parser
     * accepted. For example, calling value() on the stream returned
     * by parser c('a') will always return 'a' if the parser
     * succeeded.
     *
     * The three fundamental parser generators provided by this
     * library are c, str, and r. c generates parsers that accept
     * exactly one character. s generates parsers that accept any
     * fixed string of characters. r generates parsers that accept any
     * string matching a given regular expression.
     *
     * Examples:
     *
     *   c('a') is a parser that accepts the character 'a'.
     *
     *   str('foo') is a parser that accepts the string 'foo'.
     *
     *   r('[a-z]') is a parser that accepts any lower-case letter.
     *
     * 
     * These parsers by themselves are clearly not enough to do
     * serious parsing, but by combining them we can easily express
     * complex grammars. This library provides the following
     * combinators: ignore, seq, or, any, opt, and augment.
     * 
     *
     * ignore(parser)
     * 
     * The ignore combinator returns a parser that is identical to the
     * parser passed it, except that the new parser never sets the
     * error or data properties of the returned stream.
     * 
     * Example: ignore(r('[ \r\n\t]*')) is a parser that consumes
     *          whitespace, never fails, and produces no data.
     * 
     *
     * seq(parser1, [parser2, ...])
     * 
     * seq produces a parser that applies each parser passed it in
     * sequence. If any of them fails, the entire sequence fails.
     * 
     * Example: seq(c('f'), c('o'), c('o')) is a parser that accepts
     *          the string 'foo', but does not accept 'f' or
     *          'fo'. This is equivalent to str('foo').
     * 
     *
     * or(parser1, [parser2, ...])
     * 
     * or produces a parser that applies each parser passed it in
     * sequence. If one of the parsers succeeds, the new parser
     * returns the stream returnd by that parser. If none of the
     * passed parsers succeeds, the new parser fails.
     * 
     * Example: or(c('a'), c('b')) is a parser that accepts one
     *          character, which must be either 'a' or 'b'. This is
     *          equivalent to r('[ab]').
     * 
     *
     * any(parser1, [parser2, ...])
     * 
     * any produces a parser that applies its argument until it
     * fails. The new parser never fails, but produces the same data
     * that its passed parser produces if the parser succeeds.
     * 
     * Example: any(str('foo')) is a parser that accepts any number of
     *          occurrances of the string "foo". This is equivalent to
     *          r('(foo)*').
     * 
     *
     * opt(parser)
     * 
     * opt produces a parser that applies its argument exactly
     * once. The new parser never fails, but produces the same data
     * that its passed parser produces if the parser succeeds.
     * 
     * Example: seq(c('a'), opt(c('b')), c('c')) is a parser that
     *          accepts either the string "abc" or the string
     *          "ac". This is equivalent to r('ab?c').
     * 
     *
     * augment(evaluator, parser)
     * 
     * augment takes two arguments, a unary evaluator function E and a
     * parser P, and returns a new parser N. N applies P, and if P
     * succeeds, the stream's data property is passed to E, and the
     * return value of E is set as the data value of the stream
     * returned by N. This is really just a convenience that allows
     * arbitrary transformations of stream data as the stream is
     * parsed.
     * 
     * Example:
     *    augment(function(s) { return parseInt(s, 10); }, r('[0-9]+'))
     *    is a parser that accepts decimal integers, and returns
     *    stream whose value is the parsed integer value of the
     *    accepted string.
     *
     */

    // Creates a stream object, which represents the current parsing
    // state.
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

    /******************************************/
    /** Fundamental Parsers *******************/
    /******************************************/

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

    /******************************************/
    /** Parser Combinators ********************/
    /******************************************/

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

    /******************************************/
    /** Virtual CPU Instruction Set ***********/
    /******************************************/
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
    
    /******************************************/
    /** Toy Assembly Parser Implementation **/
    /******************************************/
    var toyAssemblyParser = (function() {
	var p = {};
	var forward = function(o, p) {
	    return function(stream) {
		return o[p](stream);
	    };
	};

	var ws = ignore(r('[ \r\n\t]*'));

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

	function toyAssemblyParser() {
	    var unaryInstructions = ['addi', 'add', 'loadi', 'load', 'read', 'write', 'cmp', 'jnz', 'jmpi', 'jmp'].map(unaryInstruction);
	    var nullaryInstructions = ['halt', 'push', 'pop'].map(nullaryInstruction);
	    var anyUnaryInstruction = or.apply(null, unaryInstructions.concat(nullaryInstructions));
	    var comment = ignore(seq(ws, c(';'), r('[^\n]+'), c('\n')));

	    return any(seq(anyUnaryInstruction, opt(comment)));
	}

	return toyAssemblyParser();

    })();

    /******************************************/
    /** Assembly Compiler *********************/
    /******************************************/
    function compile(disk, memory) {
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

	var parser = toyAssemblyParser;

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

    /******************************************/
    /** Virtual Machine Components ************/
    /******************************************/
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

    /******************************************/
    /** Virtual Machine Display Components ****/
    /******************************************/
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

    /******************************************/
    /** main **********************************/
    /******************************************/
    var availableDisks = {
	disk0: "load 5	  ; this is a comment!\n" +
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
