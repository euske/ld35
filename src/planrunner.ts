// planrunner.ts
//   requires: utils.ts
//   requires: geom.ts
//   requires: tilemap.ts
//   requires: entity.ts
//   requires: planmap.ts


class PathEntry {
    p: Vec2;
    d: number;
    next: PathEntry;
    constructor(p: Vec2, d: number, next:PathEntry) {
	this.p = p;
	this.d = d;
	this.next = next;
    }
}

//  PlanActionRunner
//
class PlanActionRunner {

    plan: PlanMap;
    actor: PlanActor;
    action: PlanAction;
    timeout: number;
    count: number;
    
    constructor(plan: PlanMap, actor: PlanActor, timeout=Infinity) {
	this.plan = plan;
	this.actor = actor;
	this.timeout = timeout;
	let cur = actor.getGridPos();
	this.action = plan.getAction(cur.x, cur.y);
	
	this.count = this.timeout;
    }

    toString() {
	return ('<PlanActionRunner: actor='+this.actor+', action='+this.action+'>');
    }

    update() {
	if (this.action === null || this.action.next === null) return false;
	if (this.count <= 0) return false;
	this.count--;
	
	let plan = this.plan;
	let actor = this.actor;
	let tilemap = plan.tilemap;
	let cur = actor.getGridPos();
	let dst = this.action.next.p;

	// Get a micro-level (greedy) plan.
	switch (this.action.type) {
	case ActionType.NONE:
	    break;

	case ActionType.WALK:
	case ActionType.CLIMB:
	    actor.moveToward(dst);
	    if (cur.equals(dst)) {
		this.action = this.action.next;
		this.count = this.timeout;
	    }
	    break;
	    
	case ActionType.FALL:
	    let path = this.findSimplePath(cur, dst);
	    for (let i = 0; i < path.length; i++) {
		let r = actor.getHitboxAt(path[i]);
		let v = r.diff(actor.getHitbox());
		if (actor.isMovable(v)) {
		    actor.moveToward(path[i]);
		    break;
		}
	    }
	    if (cur.equals(dst)) {
		this.action = this.action.next;
		this.count = this.timeout;
	    }
	    break;
	    
	case ActionType.JUMP:
	    if (actor.isLanded() && !actor.isHolding() &&
		actor.canJump(cur, dst)) {
		actor.jumpToward(dst);
		// once you leap, the action is considered finished.
		this.action = this.action.next;
		this.count = this.timeout;
	    } else {
		// not landed, holding something, or has no clearance.
		actor.moveToward(cur);
	    }
	    break;
	}

	return true;
    }

    // findSimplePath(x0, y0, x1, x1, cb): 
    //   returns a list of points that a character can proceed without being blocked.
    //   returns null if no such path exists. This function takes O(w*h).
    //   Note: this returns only a straightforward path without any detour.
    findSimplePath(p0: Vec2, p1: Vec2) {
	let a = [] as [[PathEntry]];
	let w = Math.abs(p1.x-p0.x);
	let h = Math.abs(p1.y-p0.y);
	let INF = (w+h+1)*2;
	let vx = (p0.x <= p1.x)? +1 : -1;
	let vy = (p0.y <= p1.y)? +1 : -1;
	let actor = this.actor;
	
	for (let dy = 0; dy <= h; dy++) {
	    a.push([] as [PathEntry]);
	    // y: y0...y1
	    let y = p0.y+dy*vy;
	    for (let dx = 0; dx <= w; dx++) {
		// x: x0...x1
		let x = p0.x+dx*vx;
		// for each point, compare the cost of (x-1,y) and (x,y-1).
		let p = new Vec2(x, y);
		let d:number;
		let e:PathEntry = null;	// the closest neighbor (if exists).
		if (dx === 0 && dy === 0) {
		    d = 0;
		} else {
		    d = INF;
		    if (actor.canMoveTo(p)) {
			if (0 < dx && a[dy][dx-1].d < d) {
			    e = a[dy][dx-1];
			    d = e.d;
			}
			if (0 < dy && a[dy-1][dx].d < d) {
			    e = a[dy-1][dx];
			    d = e.d;
			}
		    }
		    d++;
		}
		// populate a[dy][dx].
		a[dy].push(new PathEntry(p, d, e));
	    }
	}
	// trace them in a reverse order: from goal to start.
	let r = [] as [Vec2];
	let e = a[h][w];
	while (e !== null) {
	    r.push(e.p);
	    e = e.next;
	}
	return r;
    }
}


//  PlanningEntity
//
class PlanningEntity extends PlatformerEntity implements PlanActor {

    timeout: number;
    runner: PlanActionRunner;
    plan: PlanMap;
    obstacle: RangeMap;
    grabbable: RangeMap;
    stoppable: RangeMap;
    movement: Vec2;

    static debug: boolean;
    static gridsize: number;
    static speed: number;
    static jumppts: [Vec2];
    static fallpts: [Vec2];

    static initialize(gridsize:number, speed=4) {
	PlanningEntity.gridsize = gridsize;
	PlanningEntity.speed = speed;
	PlanningEntity.jumppts = calcJumpRange(gridsize, speed, PhysicalEntity.jumpfunc);
	PlanningEntity.fallpts = calcFallRange(gridsize, speed, PhysicalEntity.jumpfunc);
    }
    
    constructor(tilemap: TileMap, bounds: Rect,
		src: ImageSource=null, hitbox: Rect=null,
		speed=4, timeout=30) {
	super(tilemap, bounds, src, hitbox);
	this.timeout = timeout;
	this.runner = null;
	this.movement = new Vec2();

	this.plan = new PlanMap(this, PlanningEntity.gridsize, this.tilemap);
    }

    updateRangeMaps() {
	this.obstacle = this.tilemap.getRangeMap(
	    'obstacle', PlatformerEntity.isObstacle);
	this.grabbable = this.tilemap.getRangeMap(
	    'grabbable', PlatformerEntity.isGrabbable);
	this.stoppable = this.tilemap.getRangeMap(
	    'stoppable', PlatformerEntity.isStoppable);
    }

    startPlan(runner: PlanActionRunner) {
	this.runner = runner;
	log("begin:"+this.runner);
    }
  
    stopPlan() {
	if (this.runner !== null) {
	    log("end:  "+this.runner);
	    this.movement = new Vec2();
	}
	this.runner = null;
    }

    isPlanRunning() {
	return (this.runner !== null);
    }

    makePlan(p: Vec2, size=10, maxcost=20) {
	let goal = this.plan.coord2grid(p);
	if (this.runner === null ||
	    !this.runner.plan.goal.equals(goal)) {
	    this.stopPlan();
	    let range = goal.expand(size, size);
	    let start = this.getGridPos();
	    this.updateRangeMaps();
	    this.plan.initPlan(goal);
	    if (this.plan.fillPlan(range, start, maxcost)) {
		// start following a plan.
		this.startPlan(new PlanActionRunner(this.plan, this, this.timeout));
	    }
	}
	return this.isPlanRunning();
    }

    move() {
	// follow a plan.
	if (this.runner !== null) {
	    // end following a plan.
	    if (!this.runner.update()) {
		this.stopPlan();
	    }
	}
	this.moveIfPossible(this.movement, true);
    }

    fall() {
	if (!this.isHolding()) {
	    this.velocity.y = PhysicalEntity.jumpfunc(this.velocity.y, this._jumpt);
	    this.velocity = this.getMove(this.velocity, this.hitbox, false);
	    this.movePos(this.velocity);
	}
    }

    render(ctx:CanvasRenderingContext2D, bx:number, by:number) {
	super.render(ctx, bx, by);
	if (PlanningEntity.debug && this.runner !== null) {
	    this.plan.render(ctx, bx, by);
	}
    }
    
    // PlanActor methods
    
    getJumpPoints() {
	return PlanningEntity.jumppts;
    }
    getFallPoints() {
	return PlanningEntity.fallpts;
    }
    getGridPos() {
	return this.plan.coord2grid(this.hitbox.center());
    }
    getHitboxAt(p: Vec2) {
	return this.plan.grid2coord(p).expand(this.hitbox.width, this.hitbox.height);
    }
    canMoveTo(p: Vec2) {
	let hitbox = this.getHitboxAt(p);
	return !this.obstacle.exists(this.tilemap.coord2map(hitbox));
    }
    canGrabAt(p: Vec2) {
	let hitbox = this.getHitboxAt(p);
	return this.grabbable.exists(this.tilemap.coord2map(hitbox));
    }
    canStandAt(p: Vec2) {
	let hitbox = this.getHitboxAt(p).move(0, this.plan.gridsize);
	return this.stoppable.exists(this.tilemap.coord2map(hitbox));
    }
    canClimbUp(p: Vec2) {
	let hitbox = this.getHitboxAt(p);
	return this.grabbable.exists(this.tilemap.coord2map(hitbox));
    }
    canClimbDown(p: Vec2) {
	let hitbox = this.getHitboxAt(p).move(0, this.hitbox.height);
	return this.grabbable.exists(this.tilemap.coord2map(hitbox));
    }
    canFall(p0: Vec2, p1: Vec2) {
	//  +--+....
	//  |  |....
	//  +-X+.... (p0.x,p0.y) original position.
	// ##.......
	//   ...+--+
	//   ...|  |
	//   ...+-X+ (p1.x,p1.y)
	//     ######
	let hb0 = this.getHitboxAt(p0);
	let hb1 = this.getHitboxAt(p1);
	let x0 = Math.min(hb0.right(), hb1.x);
	let x1 = Math.max(hb0.x, hb1.right());
	let y0 = Math.min(hb0.y, hb1.y);
	let y1 = Math.max(hb0.bottom(), hb1.bottom());
	let rect = new Rect(x0, y0, x1-x0, y1-y0);
	return !this.stoppable.exists(this.tilemap.coord2map(rect));
    }
    canJump(p0: Vec2, p1: Vec2) {
	//  ....+--+
	//  ....|  |
	//  ....+-X+ (p1.x,p1.y) tip point
	//  .......
	//  +--+...
	//  |  |...
	//  +-X+... (p0.x,p0.y) original position.
	// ######
	let hb0 = this.getHitboxAt(p0);
	let hb1 = this.getHitboxAt(p1);
	// extra care is needed not to allow the following case:
	//      .#
	//    +--+
	//    |  |  (this is impossiburu!)
	//    +-X+
	//       #
	let rect = hb0.union(hb1);
	return !this.stoppable.exists(this.tilemap.coord2map(rect));
    }

    moveToward(p: Vec2) {
	let r = this.getHitboxAt(p);
	let v = r.diff(this.hitbox);
	v.x = clamp(-PlanningEntity.speed, v.x, +PlanningEntity.speed);
	v.y = clamp(-PlanningEntity.speed, v.y, +PlanningEntity.speed);
	this.movement = v;
    }
    
    jumpToward(p: Vec2) {
	this.setJump(Infinity);
    }
}
