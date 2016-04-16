// game.ts
//   requires: utils.ts
//   requires: geom.ts
//   requires: entity.ts
//   requires: tilemap.ts
//   requires: text.ts
//   requires: layer.ts
//   requires: scene.ts
//   requires: app.ts


//  Player
//
class Player extends PhysicalEntity {

    scene: Game;

    constructor(scene: Game, pos: Vec2) {
	let bounds = pos.expand(16, 16);
	super(bounds, new DummyImageSource('white'), bounds);
	this.scene = scene;
    }

    setMove(v: Vec2) {
	this.movement = v.scale(4);
    }
    
    update() {
	super.update();
    }

    getContactFor(v: Vec2, hitbox: Rect, force: boolean, range: Rect): Vec2 {
	let tilemap = this.scene.tilemap;
	function f(c:number) {
	    return (c == 1);
	}
	return tilemap.contactTile(hitbox, f, v, range);
    }
  
    getConstraintsFor(hitbox: Rect, force: boolean) {
	return this.scene.screen;
    }
}


//  Game
// 
class Game extends GameScene {

    sheet: SpriteSheet;
    tiles: SpriteSheet;
    
    tilemap: TileMap;
    player: Player;

    constructor(app: App) {
	super(app);
	this.sheet = new ImageSpriteSheet(app.images['sprites'], new Vec2(16,16));
	this.tiles = new DummySpriteSheet(['black','gray','blue','red']);
    }
    
    init() {
	super.init();

	let map:[[number]] = [
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
	];
	this.tilemap = new TileMap(16, map);
	
	this.player = new Player(this, this.screen.center());
	this.addObject(this.player);
	
	// show a banner.
	let textbox = new TextBox(this.screen, this.app.font);
	textbox.linespace = 2;
	textbox.duration = 30;
	textbox.putText(['GAEM!!1'], 'center', 'center');
	this.addObject(textbox);
    }

    tick() {
	super.tick();
    }

    set_dir(v: Vec2) {
	super.set_dir(v);
	this.player.setMove(this.app.key_dir);
    }

    set_action(action: boolean) {
	super.set_action(action);
	this.player.setJump(action? Infinity : 0);
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	this.layer.renderTilesFromBottomLeft(
	    ctx, bx, by,
	    this.tilemap, this.tiles,
	    (x:number,y:number,c:number) => { return this.tilemap.get(x,y); });
	super.render(ctx, bx, by);
    }
}
