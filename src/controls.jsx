/*
		 1         2         3         4         5         6         7         8
12345678901234567890123456789012345678901234567890123456789012345678901234567890

	controls.js

*/

import React 				from 'react';

import * as THREE 			from 'three';

import { GLTFLoader }		from './GLTFLoader';
/*
import { FBXLoader }		from './FBXLoader';
*/

import './App.css';
import './controls.css';

class Controls extends React.Component {
	constructor ( props ) {
		super ( props );
		this.state = {
			lowResVisible:	true };

		this.clickRunScript		= this.clickRunScript.bind ( this );
		this.clickImportDexter 	= this.clickImportDexter.bind ( this );
		this.clickHideShowLowResDexter	= 
							this.clickHideShowLowResDexter.bind ( this );  

		this.doAll				= this.doAll.bind ( this );

	}	//	constructor()


	clickRunScript ( evt ) {
		const sW = 'Controls clickRunScript()';
		console.log ( sW );
		this.props.fncApp ( { do:	'run-script' } );
	}	//	clickRunScript()

	clickImportDexter ( evt ) {
		const sW = 'Controls clickImportDexter()';
		console.log ( sW );
		const gltfLoader = new GLTFLoader();
		const url = 'HDIMeterModel.gltf';
		gltfLoader.load ( url, ( gltf ) => {
			const root = gltf.scene;
			console.log ( sW + ': Done? ' );

			let c0 = root.children[0]
			c0.scale.set ( 0.001, 0.001, 0.001 );
			//	Remove imported lights, cameras.
			c0.children.splice ( 1 )
		//	scene.add ( root ); 
			//	Same thing.
			this.props.fncApp ( { do:	'add-to-scene',
								  obj:	root			} );
		} );
		/*
		const fbxLoader = new FBXLoader();
		const url = 'HDIMeterModel.fbx';
		fbxLoader.load ( url, ( fbx ) => {
			const root = fbx.scene;
			console.log ( sW + ': Done? ' );

		//	scene.add(root); 
		} );
		*/
	}	//	clickImportDexter()

	clickHideShowLowResDexter ( evt ) {
		const sW = 'Controls clickHideShowLowResDexter()';
		console.log ( sW );

		let bShow = ! this.state.lowResVisible;

		this.props.fncApp ( { do:		'show-low-res',
							  bShow:	bShow } );

		this.setState ( { lowResVisible: bShow } );

	}	//	clickHideShowLowResDexter()


	doAll ( o ) {
		const sW = 'Controls doAll() ' + o.do;
	//	console.log ( sW );
		switch ( o.do ) {
			case 'set-call-down':
				switch ( o.what ) {
					case 'position':
						this.fncPos = o.fnc;
						break;
					case 'velocity':
						this.fncVel = o.fnc;
						break;
					case 'torque':
						this.fncTrq = o.fnc;
						break;
					default:
						console.error ( sW + ': unrecognized o.what' );
				}
				break;

			default:
				console.error ( sW + ': unrecognized o.do' );
		}
		return null;
	}	//	doAll()

	render() {
		return (
			<div style = { { margin:		'5px',
							 border:		'solid gray 1px',
							 fontSize:		'10px',
							 fontFamily:	'courier new' } } >
				<div style = { { padding:	'2px',
								 textAlign:	'center' } } >
					{ this.props.title }
				</div>
				<div style = { { padding:	'5px' } } >
					<button className = "controls-general-button controls-button"
							disabled  = { false }
							onClick   = { this.clickRunScript } >
						Run Script
					</button>
				</div>
				<div style = { { padding:	'5px' } } >
					<button className = "controls-general-button controls-button"
							disabled  = { false }
							onClick   = { this.clickImportDexter } >
						Import Dexter
					</button>
				</div>
				<div style = { { padding:	'5px' } } >
					<button className = "controls-general-button controls-button"
							disabled  = { false }
							onClick   = { this.clickHideShowLowResDexter } >
						{ this.state.lowResVisible ? 'Hide Low Res' 
												   : 'Show Low Res' }
					</button>
				</div>
			</div>
		);
	}	//	render()

	componentDidMount() {
		const sW = 'Controls componentDidMount()';
		console.log ( sW );

		if ( this.props.fncApp ) {
			this.props.fncApp ( { do:	'set-call-down',
								  what:	this.props.title,
								  fnc:	this.doAll	} ); }
	}	//	componentDidMount()


	componentWillUnmount() {
		const sW = 'Controls componentWillUnmount()';
		console.log ( sW );
	}	//	componentWillUnmount()

	componentDidUpdate ( prevProps ) {
		let sW = 'Controls componentDidUpdate()';
		console.log ( sW );
	}	//	componentDidUpdate()

}	//	class Controls

export { Controls as default };

