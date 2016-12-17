/******************************************/
/** DOM utility functions *****************/
/******************************************/

// TODO replace with React rendering?
export const H = (() => {
	function mkf(t) {
	  return function() {
  		var e = document.createElement(t)
  		for (let i in arguments) {
  	    e.append(arguments[i])
  		}
  		return e
	  }
	}

	var h = {}

	var el = ['div', 'textarea', 'button', 'br', 'tr', 'td', 'th', 'table', 'a', 'p']
	for (let j in el) {
	  h[el[j]] = mkf(el[j])
	}

	return h
})()

export const click = (h, e) => {
	e.on('click', h)
	return e
}

export const change = (h, e) => {
	e.on('change', h)
	return e
}

export const cl = (c, e) => {
	e.addClass(c)
	return e
}

export const at = (a, v, e) => {
	e.attr(a, v)
	return e
}

export const tableHeading = (cols, text) => {
	return H.tr(at('colspan', cols, H.th(text)))
}

export const mount = (renderable) => {
	var el = renderable.render()
	renderable.updated(function() {
    var newEl = renderable.render.apply(renderable, arguments)
    el.replaceWith(newEl)
    el = newEl
	})
	return el
}
