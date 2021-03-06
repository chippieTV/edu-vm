var __library_parser = (function() {
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
     * error or value of the returned stream.
     *
     * Example: ignore(r('[ \r\n\t]*')) is a parser that consumes
     *          whitespace, never fails, and produces no value.
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
     * fails. The new parser never fails, but produces the same value
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
     * once. The new parser never fails, but produces the same value
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
     * succeeds, the stream's value is passed to E, and the return
     * value of E is set as the value of the stream returned by
     * N. This is really just a convenience that allows arbitrary
     * transformations of stream value to be "baked into" the parser.
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

    return {
	EOF: EOF,
	any: any,
	augment: augment,
	c: c,
	ignore: ignore,
	mkStream: mkStream,
	opt: opt,
	or: or,
	r: r,
	seq: seq,
	str: str,
	test: test
    };
})();
