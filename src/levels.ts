// levels.ts

enum Tile {
    NONE = 0,
    FLOOR = 1,
    LADDER = 2,
    
    PLAYER = 10,
    ITEM = 11,
    
    SHAPE1 = 20,
    SHAPE2 = 21,
    SHAPE3 = 22,
}

interface CharMap {
    [index: string]: number;
}
const TILEMAP = {
    '#': Tile.FLOOR,
    'H': Tile.LADDER,

    'P': Tile.PLAYER,
    'a': Tile.ITEM,

    'A': Tile.SHAPE1,
    'B': Tile.SHAPE2,
    'C': Tile.SHAPE3,
} as CharMap;

class Level {
    
    map: [string];
    text: string;
    
    constructor(map:[string], text:string) {
	this.map = map;
	this.text = text;
    }

    getArray() {
	let a = [] as [[number]];
	for (let i = 0; i < this.map.length; i++) {
	    let src = this.map[i];
	    let dst = [] as [number]
	    for (let j = 0; j < src.length; j++) {
		let c = TILEMAP[src[j]];
		if (c === undefined) {
		    c = Tile.NONE;
		}
		dst.push(c);
	    }
	    a.push(dst)
	}
	return a;
    }
}

const LEVELS = [
    new Level([
	'.........................',
	'.........................',
	'.........................',
	'.........................',
	'.........................',
	
	'.........................',
	'.........................',
	'.........................',
	'.........................',
	'.........................',
	
	'.........................',
	'...............##H.......',
	'....#............H.......',
	'.A.###.....a...P.H.......',
	'#########################',
    ],
	      'I HAVE NO MEMORY\nBLAH\nBLAH\nBLAH\nBLAH\n'
	     ),
];
