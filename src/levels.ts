// levels.ts

enum Tile {
    NONE = 0,
    FLOOR1 = 2,
    FLOOR2 = 3,
    LADDER = 4,
    CHANGER = 5,
    DOOR = 6,
    EXIT = 7,
    SWITCHOFF = 8,
    SWITCHON = 9,
    
    PLAYER = 10,
    CHANGERENT = 11,
    DOORENT = 12,
    EXITENT = 13,
    SWITCHENT = 14,
    
    SHAPE1 = 20,
    SHAPE2 = 21,
    SHAPE3 = 22,
}

interface CharMap {
    [index: string]: number;
}
const TILEMAP = {
    '#': Tile.FLOOR1,
    'H': Tile.LADDER,

    'P': Tile.PLAYER,
    'c': Tile.CHANGERENT,
    'd': Tile.DOORENT,
    'e': Tile.EXITENT,
    'i': Tile.SWITCHENT,

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
    new Level([			// LEVEL 0
	//1234567890123456789
	'...................e',
	'..............##H###',
	'.....i.........#H...',
	'..H####..##....dH...',
	'..H...........######',
	'...........#........',
	'....................',
	'.#######............',
	'.........###...####H',
	'...................H',
	'...................H',
	'.........H###..##H##',
	'.....#...H..#....H..',
	'..P.###..H..#....H..',
	'####################',
    ],
	      "I HAVE NO MEMORY.\nI DON'T KNOW WHO I AM.\n"
	     ),
    
    new Level([			// LEVEL 1
	//12345678901234567890123456789
	'..............................',
	'....................C......e..',
	'###############H##############',
	'...............H..............',
	'.............c.H..............',
	'#####H###...##################',
	'.....H........................',
	'.....H..c...B.................',
	'###########################H##',
	'.......................#...H..',
	'..............A..i.....d...H..',
	'####H###############H#########',
	'....H...............H.........',
	'.P..H..c............H.........',
	'##############################',
    ],
	      'OH? THERE IS SOMEONE\nOVER THERE.\n'
	     ),

    new Level([			// LEVEL 2
	//1234567890123456789
	'....................',
	'......P.............',
	'############..##H###',
	'................H...',
	'................H...',
	'......i...c.....H...',
	'.....###############',
	'.....#..............',
	'.....#..............',
	'.A...d...B..B..B..i.',
	'#################H##',
	'.............#...H..',
	'.............#...H..',
	'.............d...H..',
	'####################',
	'....................',
	'....................',
	'..................e.',
	'####################',
    ],
	      "PHEW, THAT WAS CLOSE.\nNOW, HOW TO GET THROUGH THOSE GUYS?\n"
	     ),
    
];
