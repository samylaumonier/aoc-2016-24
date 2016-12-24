const clear = require('clear');
const colors = require('colors');
const getStdin = require('get-stdin');
const permutations = require('permutation');
const sleep = require('sleep');

const PATH = 'X';
const SLEEP = 1e5;

const SPACE = '.';
const WALL = '#';
const START = '0';

function solve(part, rows) {
	const graph = new Graph(rows);
	const results = [];
	const paths = permutations(graph.targets).map(
		part === 1
			? permutation => `0${permutation}`
			: permutation => `0${permutation}0`
	);

	paths.forEach(path => {
		const result = {
			path,
			distance: 0,
		};

		for (let i = 0; i < path.length - 1; i++) {
			const head = graph.nodesPerChar[path[i]];
			const target = graph.nodesPerChar[path[i + 1]];

			result.distance += graph.distances[head.char][target.char];
		}

		results.push(result);
	});

	results.sort((a, b) => a.distance - b.distance);
	const result = results[0];

	// Draw
	const steps = [
		graph.nodesPerChar[result.path[0]].key,
	];

	for (let i = 0; i < result.path.length - 1; i++) {
		const head = graph.nodesPerChar[result.path[i]];
		const target = graph.nodesPerChar[result.path[i + 1]];

		graph.steps[head.char][target.char].forEach(step => {
			steps.push(step);
		});
	}

	steps.forEach((step, i) => {
		graph.nodes[step].path = true;

		const path = result.path.split('').map((char, index) => {
			if (part === 2 && index === result.path.length - 1) {
				return i === steps.length - 1
					? char.bgGreen.white
					: char.bgRed.white;
			}

			return graph.nodesPerChar[char].path
				? char.bgGreen.white
				: char.bgRed.white;
		}).join('');

		clear();
		graph.draw(part, step);

		console.log(`path: ${path} | step ${i}/${steps.length - 1} | position ${step}`);

		sleep.usleep(SLEEP);
	});
}

class Graph {
	constructor(rows) {
		this.width = rows[0].length;
		this.height = rows.length;
		this.targets = '';
		this.nodes = {};
		this.time = -1;
		this.nodesPerChar = {};
		this.distances = {};
		this.steps = {};

		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const node = new Node(x, y, rows[y][x]);
				this.nodes[node.key] = node;

				if (node.isFlag()) {
					this.nodesPerChar[node.char] = node;

					if (node.isTarget()) {
						this.targets += node.char;
					}
				}
			}
		}

		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const node = this.getNode(x, y);

				if (node.isWall()) {
					continue;
				}
				
				if (x > 0) {
					const left = this.getNode(x - 1, y);
					if (left.isSpace()) node.neighbors.push(left);
				}

				if (x < this.width - 1) {
					const right = this.getNode(x + 1, y);
					if (right.isSpace()) node.neighbors.push(right);
				}

				if (y > 0) {
					const top = this.getNode(x, y - 1);
					if (top.isSpace()) node.neighbors.push(top);
				}

				if (y < this.height - 1) {
					const bottom = this.getNode(x, y + 1);
					if (bottom.isSpace()) node.neighbors.push(bottom);
				}
			}
		}

		this.init();
	}

	draw(part, current) {
		for (let y = 0; y < this.height; y++) {
			let row = '';

			for (let x = 0; x < this.width; x++) {
				const node = this.getNode(x, y);
				row += node.isWall()
					? node.char.bgWhite.white
					: node.path
						? node.key === current
							? PATH.bgGreen
							: node.isTarget()
								? node.char.bgGreen.white
								: node.isStart()
									? part === 1
										? START.bgGreen.white
										: START.bgRed.white
									: PATH
						: node.isTarget()
							? node.char.bgRed.white
							: ' ';
			}

			console.log(row);
		}
	}

	getNode(x, y) {
		const key = Node.getKey(x, y);
		return this.nodes[key];
	}

	init() {
		Object.keys(this.nodesPerChar).forEach(char => {
			this.initDistancesFrom(this.nodesPerChar[char]);
		});
	}

	initDistancesFrom(head) {
		const queue = [head];
		const results = [];
		this.time++;

		while (queue.length) {
			const current = queue.shift();
			current.visitedAt = this.time;

			if (current.key !== head.key && current.isFlag()) {
				results.push(current);

				if (results.length === this.targets.length) {
					break;
				}
			}

			current.neighbors
				.filter(n => n.visitedAt !== this.time)
				.forEach(n => {
					n.parent = current;
					n.visitedAt = this.time;
					queue.push(n);
				});
		}

		this.distances[head.char] = {};
		this.steps[head.char] = {};

		results.forEach(result => {
			let node = result;
			let distance = 0;

			this.steps[head.char][result.char] = [];

			while (node.key !== head.key) {
				this.steps[head.char][result.char].push(node.key);
				node = node.parent;
				distance++;
			}

			this.distances[head.char][result.char] = distance;
			this.steps[head.char][result.char] = this.steps[head.char][result.char].reverse();
		});
	}
}

class Node {
	constructor(x, y, char) {
		this.key = Node.getKey(x, y);
		this.neighbors = [];
		this.char = char;
		this.visitedAt = -1;
		this.parent = null;
		this.path = false;
	}

	static getKey(x, y) {
		return `${x};${y}`;
	}

	isStart() {
		return this.char === START;
	}

	isSpace() {
		return !this.isWall();
	}

	isWall() {
		return this.char === WALL;
	}

	isTarget() {
		return !this.isWall() && !this.isStart() && this.char !== SPACE;
	}

	isFlag() {
		return this.isStart() || this.isTarget();
	}
}

try {
	if (process.argv.length !== 3 || ![1, 2].includes(+process.argv[2])) {
		throw new Error('Invalid command');
	}

	getStdin().then(stdin => {
		stdin = stdin.replace(/\r\n?/, '\n').trim();

		if (stdin.length === 0) {
			throw new Error('Invalid input');
		}

		solve(+process.argv[2], stdin.split('\n'));
	});
} catch (e) {
	console.log(e.message);
	console.log();
	console.log('Usage:');
	console.log('npm run solve [PART] < [INPUT]');
	console.log();
	console.log('Examples:');
	console.log('To solve part 1:');
	console.log('npm run solve 1 < input.txt');
	console.log();
	console.log('To solve part 2:');
	console.log('npm run solve 2 < input.txt');
	console.log();
}
