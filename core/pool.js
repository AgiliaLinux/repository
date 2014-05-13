

function Pool() {
	var max_running = 30
	var running = 0
	var timer = null
	var timeout = 4
	var pool = []

	function update_timer() {
		if (!timer)
			timer = setTimeout(function() {
				timer = null
				run()
			}, timeout)
	}

	function resolver(data) {
		running--
		update_timer()
		return data
	}

	function run() {
		if (pool.length <= 0) {
			return
		}

		if (running > max_running) {
			update_timer()
			return
		}

		for (var i = running; i < max_running; ++i) {
			var callback = pool.shift()
			if (!callback)
				return
			running++
			callback(resolver)
		}
	}

	this.add = function(callback) {
		pool.push(callback)
		run()
	}
}

module.exports = {
	Pool: new Pool()
}

