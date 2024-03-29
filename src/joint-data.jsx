/*
		 1         2         3         4         5         6         7         8
12345678901234567890123456789012345678901234567890123456789012345678901234567890

	joint-data.js

*/

import React 				from 'react';

import Dexter				from './dexter';
import sim					from './sim';

import Guage				from './guage';

import './App.css';


class JointData extends React.Component {
	constructor ( props ) {
		super ( props );
		this.state = { }

		this.svg = {
			eleId:		props.title.trim().replace ( / /g, '-' ) }

		this.doAll		= this.doAll.bind ( this );

		this.titleWidth	= '30';

		this.fncPos = null;
		this.fncVel = null;
		this.fncTrq = null;

	}	//	constructor()


	doAll ( o ) {
		const sW = 'JontData doAll() ' + o.do;
	//	console.log ( sW );
		switch ( o.do ) {
			case 'set-call-down':
				switch ( o.what ) {
					case 'pos':
						this.fncPos = o.fnc;
						break;
					case 'vel':
						this.fncVel = o.fnc;
						break;
					case 'trq':
						this.fncTrq = o.fnc;
						break;
					default:
						console.error ( sW + ': unrecognized o.what' );
				}
				break;

			case 'set-gauges':
				if ( typeof this.fncPos === 'function' ) {
					this.fncPos ( { do: 	'set-value',
									value:	o.position } ); }
				if ( typeof this.fncVel === 'function' ) {
					this.fncVel ( { do: 	'set-value',
									value:	o.velocity } ); }
				if ( typeof this.fncTrq === 'function' ) {
					this.fncTrq ( { do: 		'set-value',
									value:		o.torque,
									valueLg:	o.torqueLg } ); }
				break;
			default:
				console.error ( sW + ': unrecognized o.do' );
		}
		return null;
	}	//	doAll()

	render() {
	//			 style = { { margin:		'5px',
	//						 border:		'solid gray 1px',
	//						 fontSize:		'10px',
	//						 fontFamily:	'courier new' } } >
		return (
			<div className = 'controls' >
				<div style = { { padding:	'2px',
								 textAlign:	'center' } } >
					{ this.props.title }
				</div>
				<svg id			= { this.svg.eleId }
					version		= "1.1"
					baseProfile	= "full"
					width		= "100%" 
					height		= "100%"
					xmlns		= "http://www.w3.org/2000/svg">
					<Guage title = 'pos' 
						   fncJointData = { this.doAll }
						   x = '4.5' y = '0.5' 
						   w = { this.titleWidth }  h = '266'
						   min = '-180' max = '180' />
					<Guage title = 'vel' 
						   fncJointData = { this.doAll }
						   x =  '50.5' y = '0.5' 
						   w = { this.titleWidth }  h = '266'
						   min = '-100' max = '100' />
					<Guage title = 'trq'   
						   fncJointData = { this.doAll }
						   x = '98.5' y = '0.5' 
						   w = { this.titleWidth }  h = '266'
						   min = '-5' max = '5' />
				</svg>
			</div>
		);
	}	//	render()

	componentDidMount() {
		const sW = 'JointData componentDidMount()';
		console.log ( sW );

		if ( this.props.fncApp ) {
			this.props.fncApp ( { do:	'set-call-down',
								  what:	this.props.title,
								  fnc:	this.doAll	} ); }
	}	//	componentDidMount()


	componentWillUnmount() {
		const sW = 'JointData componentWillUnmount()';
		console.log ( sW );
	}	//	componentWillUnmount()

	componentDidUpdate ( prevProps ) {
		let sW = 'JointData componentDidUpdate()';
		console.log ( sW );
	}	//	componentDidUpdate()

}	//	class JointData

export { JointData as default };

