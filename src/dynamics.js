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

	let numLinks = 0;

	let multiBody = null;
	
	let inverseModel = null;

	let nSteps = 0;

	//	Could not expose the btBrodphaseProxy CollisionFilterGroups enum.
	//	So, for now, ...
	let CollisionFilter = { DefaultFilter:		1,
							StaticFilter:		2,
							KinematicFilter:	4,
							DebrisFilter:		8,
							SensorTrigger:		16,
							CharacterFilter:	32,
							AllFilter:			-1 };

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
		let broadphase = new Ammo.btSimpleBroadphase();
		let solver = new Ammo.btMultiBodyConstraintSolver();
		world = new Ammo.btMultiBodyDynamicsWorld ( dispatcher,
													broadphase,
													solver,
													collisionConfiguration );
		world.setGravity ( new Ammo.btVector3 ( 0, -9.8, 0 ) );
	};

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
														h2 - w2,
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
		rotParentToCurrent = new Ammo.btQuaternion ( 0, 0, Math.PI / 2, 1 );
		hingeJointAxis = new Ammo.btVector3 ( 0, 1, 0 );
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

		multiBody.setLinearDamping ( 0 );
		multiBody.setAngularDamping ( 0 );

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
		local_origin.push ( multiBody.getBasePos() );
		
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
			let a   = lo.op_add ( rot );
			local_origin.push ( a );
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
		
		//	Collisions - Link 2
		//	
		posr = local_origin[2];
		wtl  = world_to_local[2];
		shape = new Ammo.btBoxShape ( linkHalfExtents[1] );
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

		//	Collisions - Link 3
		//	
		posr = local_origin[3];
		wtl  = world_to_local[3];
		shape = new Ammo.btBoxShape ( linkHalfExtents[2] );
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
		
		//	Collisions - Link 4
		//	
		posr = local_origin[4];
		wtl  = world_to_local[4];
		shape = new Ammo.btBoxShape ( linkHalfExtents[3] );
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

		//	Collisions - Link 5
		//	
		posr = local_origin[5];
		wtl  = world_to_local[5];
		shape = new Ammo.btBoxShape ( linkHalfExtents[4] );
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
									 jt ) {			//	joint torques

		if ( ! multiBody ) {
			return; }

		let num_dofs = multiBody.getNumDofs();
		
		let nu			= new Ammo.vecx ( num_dofs );
		let qdot		= new Ammo.vecx ( num_dofs );
		let q			= new Ammo.vecx ( num_dofs );
		let joint_force	= new Ammo.vecx ( num_dofs );
		let pd_control	= new Ammo.vecx ( num_dofs );
		
		//	Compute joint forces from one of two control laws:
		//	
		//	1)	"Computed torque" control, which gives perfect, decoupled,
		//		linear second order error dynamics per dof in case of a
		//		perfect model and (and negligible time discretization effects).
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
			pd_control.set ( dof,   kd * (qd_dot - qdot.get ( dof )) 
								  + kp * (qd[dof] - q.get ( dof )) );

			//	nu is the desired joint acceleration for computed torque 
			//	control.
			//	
		//	nu.set ( dof,  qd_ddot + pd_control.get ( dof ) );
			let a = qd_ddot + pd_control.get ( dof );
		//	if ( Math.abs ( a ) > 10 ) {
		//		a /= 5; }
			a /= 10;
			nu.set ( dof,  a );
		}

		nSteps += 1;

		if ( useInverseModel ) {
			//	Calculate joint forces corresponding to desired accelerations 
			//	nu.
			let r = inverseModel.calculateInverseDynamics ( q, qdot, nu, 
														    joint_force );
			if ( -1 !== r ) {
				let anu = [];
				//	Use inverse model: apply joint force corresponding to
				//	desired acceleration nu.
				for ( let dof = 0; dof < num_dofs; dof++ ) {
					let vel = qdot.get ( dof );
					jv.push ( vel );
					let trq = joint_force.get ( dof );
					jt.push ( trq );
					multiBody.addJointTorque ( dof, trq ); 

					anu.push ( nu.get ( dof ) );
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
		}
		
		if ( ! world ) {
			return; }

		// 	todo(thomas) check that this is correct:
		//	want to advance by 10ms, with 1ms timesteps
		//	
		world.stepSimulation ( 0.001, 0 );
		multiBody.forwardKinematics();

		for ( let dof = 0; dof < num_dofs; dof++ ) {
			jc.push ( multiBody.getJointPos ( dof ) ); }

		Ammo.destroy ( nu );
		Ammo.destroy ( qdot );
		Ammo.destroy ( q );
		Ammo.destroy ( joint_force );
		Ammo.destroy ( pd_control );

	};	//	stepSimulation()

	return self;
} )();

export { dynamics as default };

//	dynamics.js
