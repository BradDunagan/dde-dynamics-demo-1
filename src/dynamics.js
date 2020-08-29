/*
		 1         2         3         4         5         6         7         8
12345678901234567890123456789012345678901234567890123456789012345678901234567890

	dynamics.js

*/

import Dexter				from './dexter';
import sim					from './sim';

let dynamics = ( function() {

	let self = {};

	let Ammo = null;

	let quatRotate = null;

	let world = null;

	let ground = null;

	let numLinks = 0;

	let multiBody = null;
	
	let inverseModel = null;

	let nSteps = 0;
	
	let shapes		= [];
	let	colliders	= [];
	

	//	Could not expose the btBrodphaseProxy CollisionFilterGroups enum.
	//	So, for now, ...
	let CollisionFilter = { DefaultFilter:		1,
							StaticFilter:		2,
							KinematicFilter:	4,
							DebrisFilter:		8,
							SensorTrigger:		16,
							CharacterFilter:	32,
							AllFilter:			-1 };

	self.ground = null;
	self.blocks = [];

	self.init = function() {
		return window.Ammo().then ( () => {
			Ammo = window.Ammo;
			quatRotate = (new Ammo.btQuaternion ( 0, 0, 0, 1 )).quatRotate;
			return 'ready';
		} );
	};	//	init()

	self.createEmptyDynamicsWorld = function() {
		let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		let dispatcher = new Ammo.btCollisionDispatcher (
													collisionConfiguration );
		let broadphase = new Ammo.btSimpleBroadphase ( 1000 );
		let solver = new Ammo.btMultiBodyConstraintSolver();
		world = new Ammo.btMultiBodyDynamicsWorld ( dispatcher,
													broadphase,
													solver,
													collisionConfiguration );
		world.setGravity ( new Ammo.btVector3 ( 0, -9.8, 0 ) );
	};


//	self.createDexterWorld = function ( block ) {
//
//		self.createGround();
//
//		self.createBlock ( block.w, block.h, block.l );
//
//	}	//	createDexterWorld()


	self.createGround = function() {

		let extents = new Ammo.btVector3 ( 2, 2, 2 );
		let groundShape = new Ammo.btBoxShape ( extents );

		let groundTransform = new Ammo.btTransform();
		groundTransform.setIdentity();
		let orgn = new Ammo.btVector3 ( 0, -2, 0 );
		groundTransform.setOrigin ( orgn );

		let mass = 0;		//	Ground is not dynamic (does not move).
		let inertiaDiag = new Ammo.btVector3 ( 0, 0, 0 );

		ground = new Ammo.btMultiBody ( 0,
									    mass,
									    inertiaDiag,
									    true,			//	fixed 
									    false );		//	can sleep

		ground.setBaseWorldTransform ( groundTransform );	
		ground.finalizeMultiDof();
		ground.setAngularDamping ( 0.10 );
		ground.setLinearDamping ( 2.00 );
		world.addMultiBody ( ground );
		
		let colsn = new Ammo.btMultiBodyLinkCollider ( ground, -1 );
		colsn.setCollisionShape ( groundShape );

		colsn.setWorldTransform ( groundTransform );

		let collisionFilterGroup = CollisionFilter.StaticFilter;
		let collisionFilterMask  =   CollisionFilter.AllFilter
								   ^ CollisionFilter.StaticFilter;
		world.addCollisionObject ( colsn, collisionFilterGroup, 
										  collisionFilterMask );
		ground.setBaseCollider ( colsn );

		self.ground = ground;

	}	//	createGround()


	self.createBlock = function ( name, w, l, h ) {

		let extents = new Ammo.btVector3 ( w/2, h/2, l/2 );
		let blockShape = new Ammo.btBoxShape ( extents );

		let blockTransform = new Ammo.btTransform();
		blockTransform.setIdentity();
		let v = new Ammo.btVector3 ( 1, 1, 1 );
	//	let v = new Ammo.btVector3 ( 0, 0, 1 );
	//	let v = new Ammo.btVector3 ( 0, 1, 0 );
		let q = new Ammo.btQuaternion();
	//	q.setRotation ( v, Math.PI / 10 );
		q.setRotation ( v, Math.PI / 9 );
		blockTransform.setRotation ( q );

		//	Drop from ...
		let orgn = new Ammo.btVector3 ( -0.5, 0.5, 0 );
		blockTransform.setOrigin ( orgn );

		let mass = 1;
		let inertiaDiag = new Ammo.btVector3 ( 0, 0, 0 );
		blockShape.calculateLocalInertia ( mass, inertiaDiag );

		let block = new Ammo.btMultiBody ( 0,
										   mass,
										   inertiaDiag,
										   false,			//	fixed 
										   false );			//	can sleep

		block.setBaseWorldTransform ( blockTransform );	
		block.finalizeMultiDof();
		block.setAngularDamping ( 0.10 );
		block.setLinearDamping ( 2.00 );
		world.addMultiBody ( block );
		
		let colsn = new Ammo.btMultiBodyLinkCollider ( block, -1 );
		colsn.setCollisionShape ( blockShape );

	//	colsn.setWorldTransform ( blockTransform );
		let posr = block.getBasePos();
	//	let wtl  = block.getWorldToBaseRot();
		let wtl  = block.getWorldToBaseRot().inverse();
		let tr = new Ammo.btTransform();
		tr.setIdentity();
		tr.setOrigin ( posr );
		let orn = new Ammo.btQuaternion ( -wtl.x(), -wtl.y(), -wtl.z(), 
										   wtl.w() );
		tr.setRotation ( orn );
		colsn.setWorldTransform ( tr );

		let collisionFilterGroup = CollisionFilter.DefaultFilter;
		let collisionFilterMask  = CollisionFilter.AllFilter;
		world.addCollisionObject ( colsn, collisionFilterGroup, 
										  collisionFilterMask );
		block.setBaseCollider ( colsn );
		colliders.push ( { name:	name,
						   exts:	extents,
						   colsn:	colsn } );

		self.blocks.push ( block );

	}	//	createBlock()


	self.createMultiBody = function() {
		const sW = 'dynamics createMultiBody()';

		numLinks = 5;

		multiBody = null;

		//	The base.
		//
		//	For now it is assumed that, for dynamics,  modeling the base as a 
		//	simple box will be okay.
		let leg_length = Dexter.LEG_LENGTH;
		let leg_height = leg_length / 6;
		let baseHalfExtents = new Ammo.btVector3 ( leg_length, 
												   leg_length,
												   leg_height / 2 );
		let baseMass = 0;		//	For now the base does not move.
		let baseInertiaDiag = new Ammo.btVector3 ( 0, 0, 0 );
		multiBody = new Ammo.btMultiBody ( numLinks,
										   baseMass,
										   baseInertiaDiag,
										   true,		//	fixed base
										   false );		//	can sleep
		let baseWorldTransform = new Ammo.btTransform();
		baseWorldTransform.setIdentity();
		let p0 = sim.J0.position;
		let o0 = new Ammo.btVector3 ( p0.x, p0.y, p0.z );
		baseWorldTransform.setOrigin ( o0 );
		multiBody.setBaseWorldTransform ( baseWorldTransform );

		//	The links.
		//	
		//	COM:	Center Of Momentum
		//	https://en.wikipedia.org/wiki/Center-of-momentum_frame
		//
		let parentComToCurrentCom 		= null;
		let currentPivotToCurrentCom	= null;
		let	parentComToCurrentPivot		= null;
		let w2							= null;
		let h2							= null;
		let linkHalfExtents				= [];
		let shape						= null;
		let linkInertiaDiag				= null;
		let rotParentToCurrent			= null;
		let hingeJointAxis				= null;

		//	Link 1
		//
		w2 = Dexter.LINK1_AVERAGE_DIAMETER / 2;
		h2 = Dexter.LINK1 / 2;
		//	Parent COM to this link's COM.
	//	parentComToCurrentCom = new Ammo.btVector3 (
	//		0,
	//		sim.J1.positon.y + (h2 - w2),
	//		0 );
		currentPivotToCurrentCom = new Ammo.btVector3 ( 0,
														h2 - w2,
														0 );
		parentComToCurrentPivot = new Ammo.btVector3 ( 0,
													   sim.J1.position.y,
													   0 );
		linkHalfExtents.push ( new Ammo.btVector3 ( w2, h2, w2 ) );
		shape = new Ammo.btBoxShape ( linkHalfExtents[0] );
		linkInertiaDiag = new Ammo.btVector3 ( 0, 0, 0 );
		shape.calculateLocalInertia ( Dexter.LINK1_MASS, linkInertiaDiag );
		Ammo.destroy ( shape );
		shape = null;
		rotParentToCurrent = new Ammo.btQuaternion ( 0, 0, 0, 1 );
		hingeJointAxis = new Ammo.btVector3 ( 0, 1, 0 );
		multiBody.setupRevolute ( 
			0,							//	Link index.
			Dexter.LINK1_MASS,
			linkInertiaDiag,
			0 - 1,						//	Parent index.
			rotParentToCurrent,
			hingeJointAxis,
			parentComToCurrentPivot,
			currentPivotToCurrentCom,
			false );					//	Do not disable parent collision.

		//	Link 2
		//
		w2 = Dexter.LINK2_AVERAGE_DIAMETER / 2;
		h2 = Dexter.LINK2 / 2;
		currentPivotToCurrentCom = new Ammo.btVector3 ( 0,
														h2 - w2,
														0 );
		parentComToCurrentPivot = new Ammo.btVector3 ( 0,
													   sim.J2.position.y,
													   0 );
		linkHalfExtents.push ( new Ammo.btVector3 ( w2, h2, w2 ) );
		shape = new Ammo.btBoxShape ( linkHalfExtents[1] );
		linkInertiaDiag = new Ammo.btVector3 ( 0, 0, 0 );
		shape.calculateLocalInertia ( Dexter.LINK2_MASS, linkInertiaDiag );
		Ammo.destroy ( shape );
		shape = null;
		rotParentToCurrent = new Ammo.btQuaternion ( 0, 0, 0, 1 );
		hingeJointAxis = new Ammo.btVector3 ( 0, 0, 1 );
		multiBody.setupRevolute ( 
			1,							//	Link index.
			Dexter.LINK2_MASS,
			linkInertiaDiag,
			1 - 1,						//	Parent index.
			rotParentToCurrent,
			hingeJointAxis,
			parentComToCurrentPivot,
			currentPivotToCurrentCom,
			false );					//	Do not disable parent collision.
	
		//	Link 3
		//
		w2 = Dexter.LINK3_AVERAGE_DIAMETER / 2;
		h2 = Dexter.LINK3 / 2;
		currentPivotToCurrentCom = new Ammo.btVector3 ( 0,
														h2 - w2,
														0 );
		parentComToCurrentPivot = new Ammo.btVector3 ( 0,
													   sim.J3.position.y,
													   0 );
		linkHalfExtents.push ( new Ammo.btVector3 ( w2, h2, w2 ) );
		shape = new Ammo.btBoxShape ( linkHalfExtents[2] );
		linkInertiaDiag = new Ammo.btVector3 ( 0, 0, 0 );
		shape.calculateLocalInertia ( Dexter.LINK3_MASS, linkInertiaDiag );
		Ammo.destroy ( shape );
		shape = null;
		rotParentToCurrent = new Ammo.btQuaternion ( 0, 0, 0, 1 );
		hingeJointAxis = new Ammo.btVector3 ( 0, 0, 1 );
		multiBody.setupRevolute ( 
			2,							//	Link index.
			Dexter.LINK3_MASS,
			linkInertiaDiag,
			2 - 1,						//	Parent index.
			rotParentToCurrent,
			hingeJointAxis,
			parentComToCurrentPivot,
			currentPivotToCurrentCom,
			false );					//	Do not disable parent collision.

		//	Link 4
		//
		w2 = Dexter.LINK4_AVERAGE_DIAMETER / 2;
		h2 = Dexter.LINK4 / 2;
		currentPivotToCurrentCom = new Ammo.btVector3 ( 0,
														h2 - w2,
														0 );
		parentComToCurrentPivot = new Ammo.btVector3 ( 0,
													   sim.J4.position.y,
													   0 );
		linkHalfExtents.push ( new Ammo.btVector3 ( w2, h2, w2 ) );
		shape = new Ammo.btBoxShape ( linkHalfExtents[3] );
		linkInertiaDiag = new Ammo.btVector3 ( 0, 0, 0 );
		shape.calculateLocalInertia ( Dexter.LINK4_MASS, linkInertiaDiag );
		Ammo.destroy ( shape );
		shape = null;
		rotParentToCurrent = new Ammo.btQuaternion ( 0, 0, 0, 1 );
		hingeJointAxis = new Ammo.btVector3 ( 0, 0, 1 );
		multiBody.setupRevolute ( 
			3,							//	Link index.
			Dexter.LINK4_MASS,
			linkInertiaDiag,
			3 - 1,						//	Parent index.
			rotParentToCurrent,
			hingeJointAxis,
			parentComToCurrentPivot,
			currentPivotToCurrentCom,
			false );					//	Do not disable parent collision.

		//	Link 5
		//
		w2 = Dexter.LINK5_AVERAGE_DIAMETER / 2;
		h2 = Dexter.LINK5 / 2;
		currentPivotToCurrentCom = new Ammo.btVector3 ( 0,
														-(h2 - w2),
														0 );
		parentComToCurrentPivot = new Ammo.btVector3 ( 0,
													   sim.J5.position.y,
													   0 );
		linkHalfExtents.push ( new Ammo.btVector3 ( w2, h2, w2 ) );
		shape = new Ammo.btBoxShape ( linkHalfExtents[4] );
		linkInertiaDiag = new Ammo.btVector3 ( 0, 0, 0 );
		shape.calculateLocalInertia ( Dexter.LINK5_MASS, linkInertiaDiag );
		Ammo.destroy ( shape );
		shape = null;
		rotParentToCurrent = new Ammo.btQuaternion();
		rotParentToCurrent.setRotation ( new Ammo.btVector3 ( 0, 0, 1 ),
										 Math.PI / 2 );
	//	hingeJointAxis = new Ammo.btVector3 (  0, 1, 0 );
		hingeJointAxis = new Ammo.btVector3 ( -1, 0, 0 );
		multiBody.setupRevolute ( 
			4,							//	Link index.
			Dexter.LINK5_MASS,
			linkInertiaDiag,
			4 - 1,						//	Parent index.
			rotParentToCurrent,
			hingeJointAxis,
			parentComToCurrentPivot,
			currentPivotToCurrentCom,
			false );					//	Do not disable parent collision.


		multiBody.finalizeMultiDof();

		world.addMultiBody ( multiBody );

		multiBody.setCanSleep ( false );

		multiBody.setHasSelfCollision ( false );

		multiBody.setUseGyroTerm ( false );

		multiBody.setLinearDamping ( 0.10 );
		multiBody.setAngularDamping ( 1.00 );

		//	Collisions
		//
		let world_to_local	= [];
		let local_origin	= [];
		let colsn			= null;
		let tr				= null;
		let orn				= null;
		let collisionFilterGroup	= null;
		let collisionFilterMask		= null;

		//	Collisions - Base
		//
		//	Again, modeling the base as a box. For now.
		//
		world_to_local.push ( multiBody.getWorldToBaseRot() );
	//	local_origin.push ( multiBody.getBasePos() );
		let o = multiBody.getBasePos();
		local_origin.push ( new Ammo.btVector3 ( o.x(), o.y(), o.z() ) );
		
		shape = new Ammo.btBoxShape ( baseHalfExtents );
		colsn = new Ammo.btMultiBodyLinkCollider ( multiBody, -1 );
		colsn.setCollisionShape ( shape );

		//	Is this necessary?
		tr = new Ammo.btTransform();
		tr.setIdentity();
		tr.setOrigin ( local_origin[0] );
		orn = new Ammo.btQuaternion ( new Ammo.btVector3 ( 0, 0, 0 ), 1 );
		tr.setRotation ( orn );
		colsn.setWorldTransform ( tr );

		collisionFilterGroup = CollisionFilter.StaticFilter;
		collisionFilterMask  =   CollisionFilter.AllFilter
							   ^ CollisionFilter.StaticFilter;
		world.addCollisionObject ( colsn, collisionFilterGroup, 
										  collisionFilterMask );
		multiBody.setBaseCollider ( colsn );

		for ( let i = 0; i < numLinks; i++ ) {
			let parent = multiBody.getParent ( i );
			let parentToLocalRot = multiBody.getParentToLocalRot ( i );
			let worldToLocal = world_to_local[parent + 1];
			let m = parentToLocalRot.op_mulq ( worldToLocal );
			let w2l = new Ammo.btQuaternion ( m.x(), m.y(), m.z(), m.w() );
			world_to_local.push ( w2l );

			let inv = world_to_local[i + 1].inverse();
			let rv  = multiBody.getRVector ( i );
			let rot = quatRotate ( inv, rv );
			let lo  = local_origin[parent + 1];
		//	let a   = lo.op_add ( rot );
			let a = new Ammo.btVector3 ( lo.x(), lo.y(), lo.z() );
			a.op_add ( rot );
		//	local_origin.push ( a );
			local_origin.push ( new Ammo.btVector3 ( a.x(), a.y(), a.z() ) );
		}	//	for ( numLinks )


		//	Collisions - Links
		//
		let posr = null;
		let wtl  = null;
		let link = null;

		//	Collisions - Link 1
		//	
		posr = local_origin[1];
		wtl  = world_to_local[1];
		shape = new Ammo.btBoxShape ( linkHalfExtents[0] );
		shapes.push ( shape );
		colsn = new Ammo.btMultiBodyLinkCollider ( multiBody, 0 );
		colsn.setCollisionShape ( shape );
		tr = new Ammo.btTransform();
		tr.setIdentity();
		tr.setOrigin ( posr );
		orn = new Ammo.btQuaternion ( -wtl.x(), -wtl.y(), -wtl.z(), wtl.w() );
		tr.setRotation ( orn );
		colsn.setWorldTransform ( tr );
		collisionFilterGroup = CollisionFilter.DefaultFilter;
		collisionFilterMask  = CollisionFilter.AllFilter;
		world.addCollisionObject ( colsn, collisionFilterGroup, 
										  collisionFilterMask );
		link = multiBody.getLink ( 0 );
		link.set_m_collider ( colsn );
		colliders.push ( { name:	'link-1',
						   exts:	linkHalfExtents[0],
						   colsn:	colsn } );
		
		//	Collisions - Link 2
		//	
		posr = local_origin[2];
		wtl  = world_to_local[2];
		shape = new Ammo.btBoxShape ( linkHalfExtents[1] );
		shapes.push ( shape );
		colsn = new Ammo.btMultiBodyLinkCollider ( multiBody, 1 );
		colsn.setCollisionShape ( shape );
		tr = new Ammo.btTransform();
		tr.setIdentity();
		tr.setOrigin ( posr );
		orn = new Ammo.btQuaternion ( -wtl.x(), -wtl.y(), -wtl.z(), wtl.w() );
		tr.setRotation ( orn );
		colsn.setWorldTransform ( tr );
		collisionFilterGroup = CollisionFilter.DefaultFilter;
		collisionFilterMask  = CollisionFilter.AllFilter;
		world.addCollisionObject ( colsn, collisionFilterGroup, 
										  collisionFilterMask );
		link = multiBody.getLink ( 1 );
		link.set_m_collider ( colsn );
		colliders.push ( { name:	'link-2',
						   exts:	linkHalfExtents[1],
						   colsn:	colsn } );

		//	Collisions - Link 3
		//	
		posr = local_origin[3];
		wtl  = world_to_local[3];
		shape = new Ammo.btBoxShape ( linkHalfExtents[2] );
		shapes.push ( shape );
		colsn = new Ammo.btMultiBodyLinkCollider ( multiBody, 2 );
		colsn.setCollisionShape ( shape );
		tr = new Ammo.btTransform();
		tr.setIdentity();
		tr.setOrigin ( posr );
		orn = new Ammo.btQuaternion ( -wtl.x(), -wtl.y(), -wtl.z(), wtl.w() );
		tr.setRotation ( orn );
		colsn.setWorldTransform ( tr );
		collisionFilterGroup = CollisionFilter.DefaultFilter;
		collisionFilterMask  = CollisionFilter.AllFilter;
		world.addCollisionObject ( colsn, collisionFilterGroup, 
										  collisionFilterMask );
		link = multiBody.getLink ( 2 );
		link.set_m_collider ( colsn );
		colliders.push ( { name:	'link-3',
						   exts:	linkHalfExtents[2],
						   colsn:	colsn } );
		
		//	Collisions - Link 4
		//	
		posr = local_origin[4];
		wtl  = world_to_local[4];
		shape = new Ammo.btBoxShape ( linkHalfExtents[3] );
		shapes.push ( shape );
		colsn = new Ammo.btMultiBodyLinkCollider ( multiBody, 3 );
		colsn.setCollisionShape ( shape );
		tr = new Ammo.btTransform();
		tr.setIdentity();
		tr.setOrigin ( posr );
		orn = new Ammo.btQuaternion ( -wtl.x(), -wtl.y(), -wtl.z(), wtl.w() );
		tr.setRotation ( orn );
		colsn.setWorldTransform ( tr );
		collisionFilterGroup = CollisionFilter.DefaultFilter;
		collisionFilterMask  = CollisionFilter.AllFilter;
		world.addCollisionObject ( colsn, collisionFilterGroup, 
										  collisionFilterMask );
		link = multiBody.getLink ( 3 );
		link.set_m_collider ( colsn );
		colliders.push ( { name:	'link-4',
						   exts:	linkHalfExtents[3],
						   colsn:	colsn } );

		//	Collisions - Link 5
		//	
		posr = local_origin[5];
		wtl  = world_to_local[5];
		shape = new Ammo.btBoxShape ( linkHalfExtents[4] );
		shapes.push ( shape );
		colsn = new Ammo.btMultiBodyLinkCollider ( multiBody, 4 );
		colsn.setCollisionShape ( shape );
		tr = new Ammo.btTransform();
		tr.setIdentity();
		tr.setOrigin ( posr );
		orn = new Ammo.btQuaternion ( -wtl.x(), -wtl.y(), -wtl.z(), wtl.w() );
		tr.setRotation ( orn );
		colsn.setWorldTransform ( tr );
		collisionFilterGroup = CollisionFilter.DefaultFilter;
		collisionFilterMask  = CollisionFilter.AllFilter;
		world.addCollisionObject ( colsn, collisionFilterGroup, 
										  collisionFilterMask );
		link = multiBody.getLink ( 4 );
		link.set_m_collider ( colsn );
		colliders.push ( { name:	'link-5',
						   exts:	linkHalfExtents[4],
						   colsn:	colsn } );

		//	MultiBody tree.
		//
		let id_creator = new Ammo.btMultiBodyTreeCreator();

		if ( -1 === id_creator.createFromBtMultiBody ( multiBody, false ) ) {
			console.error ( sW + ': failed to create creator' ); }
		else {
			inverseModel = id_creator.CreateMultiBodyTree ( id_creator ); }

		return multiBody;

	};	//	createMultiBody()

	//	This (including the comments) is pretty much copied from Bullet3's 
	//	InverseDynamicsExample::stepSimulation().
	//
	//	The only major difference from the example is that all the parameters
	//	except deltaTime are of the class instance in the example.
	//
	self.stepSimulation = function ( deltaTime,
									 qd,			//	joint target values
									 useInverseModel,
									 jc,			//	joint current values
									 kp, kd,
									 jv,			//	joint velocities
									 jt,			//	joint torques
									 ground,
									 blocks ) {

		let num_dofs	= 0;
		let nu			= null;
		let qdot		= null;
		let q			= null;
		let joint_force	= null;
		let pd_control	= null;
		
		if ( ! multiBody ) {
			jc.splice ( 0, 0, 0, 0, 0, 0, 0 );
			jv.splice ( 0, 0, 0, 0, 0, 0, 0 );
			jt.splice ( 0, 0, 0, 0, 0, 0, 0 ); }

		if ( multiBody ) {
			num_dofs = multiBody.getNumDofs();
			
			nu			= new Ammo.vecx ( num_dofs );
			qdot		= new Ammo.vecx ( num_dofs );
			q			= new Ammo.vecx ( num_dofs );
			joint_force	= new Ammo.vecx ( num_dofs );
			pd_control	= new Ammo.vecx ( num_dofs );
			
			//	Compute joint forces from one of two control laws:
			//	
			//	1)	"Computed torque" control, which gives perfect, decoupled,
			//		linear second order error dynamics per dof in case of a
			//		perfect model and (and negligible time discretization 
			//		effects).
			//	
			//	2)	Decoupled PD control per joint, without a model.
			//
			for ( let dof = 0; dof < num_dofs; dof++ ) {
				q.set ( dof, multiBody.getJointPos ( dof ) );
				qdot.set ( dof, multiBody.getJointVel ( dof ) );

				const qd_dot = 0;
				const qd_ddot = 0;
			//	const qd_dot  = 1.0;
			//	const qd_ddot = 0.1;

				//	pd_control is either desired joint torque for pd control,
				//	or the feedback contribution to nu.
				//
			//	pd_control.set ( dof,   kd * (qd_dot - qdot.get ( dof )) 
			//						  + kp * (qd[dof] - q.get ( dof )) );

				let a =   kd * (qd_dot - qdot.get ( dof )) 
						+ kp * (qd[dof] - q.get ( dof ));
			//	a /= 20;
				pd_control.set ( dof, a );

				//	nu is the desired joint acceleration for computed torque 
				//	control.
				//	
			//	nu.set ( dof,  qd_ddot + pd_control.get ( dof ) );
				a = qd_ddot + pd_control.get ( dof );
			//	if ( Math.abs ( a ) > 10 ) {
			//		a /= 5; }
			//	a /= 10;
				nu.set ( dof,  a );
			}

			nSteps += 1;

			if ( useInverseModel ) {
				//	Calculate joint forces corresponding to desired 
				//	accelerations nu.
				let r = inverseModel.calculateInverseDynamics ( q, qdot, nu, 
																joint_force );
				if ( -1 !== r ) {
				//	let anu = [];
					//	Use inverse model: apply joint force corresponding to
					//	desired acceleration nu.
					for ( let dof = 0; dof < num_dofs; dof++ ) {
						let vel = qdot.get ( dof );
						jv.push ( vel );
						let trq = joint_force.get ( dof );
						jt.push ( trq );
						multiBody.addJointTorque ( dof, trq ); 

				//		anu.push ( nu.get ( dof ) );
					}

				//	console.log ( 'nu: ' + anu );
				}
			}
			else {
				for ( let dof = 0; dof < num_dofs; dof++ )
				{
					//	No model: just apply PD control law.
					multiBody.addJointTorque ( dof, pd_control.get ( dof ) );
				}
				jv.splice ( 0, 0, 0, 0, 0, 0, 0 );		//	for now
				jt.splice ( 0, 0, 0, 0, 0, 0, 0 );		//
			}
		}	//	if ( multiBody )
	
		
		if ( world ) {
			// 	todo(thomas) check that this is correct:
			//	want to advance by 10ms, with 1ms timesteps
		//	world.stepSimulation ( 0.001, 0 );
			world.stepSimulation ( 1 / 60, 1 ); }

		if ( multiBody ) {
			multiBody.forwardKinematics();

			for ( let dof = 0; dof < num_dofs; dof++ ) {
				jc.push ( multiBody.getJointPos ( dof ) ); } }

		if ( self.ground ) {
			ground.ammoQ = self.ground.getWorldToBaseRot();
			ground.ammoP = self.ground.getBasePos(); }
			
		if ( self.blocks ) {
			self.blocks.forEach ( b => {
				blocks.push ( { ammoQ: b.getWorldToBaseRot(),
								ammoP: b.getBasePos() } );
			} ); }

		if ( multiBody ) {
			Ammo.destroy ( nu );
			Ammo.destroy ( qdot );
			Ammo.destroy ( q );
			Ammo.destroy ( joint_force );
			Ammo.destroy ( pd_control ); }

	};	//	stepSimulation()

	self.getCollisionObjectPositions = function() {
		let poses = [];
		colliders.forEach ( col => {
			let t = col.colsn.getWorldTransform();
			let o = t.getOrigin();
			let q = t.getRotation();
		//	if ( col.name === 'block-a' ) {
		//		q = q.inverse(); }
			poses.push ( { name:	col.name,
						   w:	col.exts.x() * 2,
						   h:	col.exts.y() * 2,
						   l:	col.exts.z() * 2,
						   px:	o.x(),
						   py:	o.y(),
						   pz:	o.z(),
						   qx:	q.getAxis().x(),
						   qy:	q.getAxis().y(),
						   qz:	q.getAxis().z(),
						   qa:	q.getAngle() } );
		} );
		return poses;
	}	//	getCollisionObjectPositions()

	return self;
} )();

export { dynamics as default };

//	dynamics.js
