/*
		 1         2         3         4         5         6         7         8
12345678901234567890123456789012345678901234567890123456789012345678901234567890

	guage.jsx
*/

import React 				from 'react';

import dynamics				from './dynamics';
import Dexter				from './dexter';
import sim					from './sim';

import './App.css';


class Guage extends React.Component {
	constructor ( props ) {
		super ( props );
		this.state = { 
			value:		0, 
			valueLg :	null }

		this.doAll			= this.doAll.bind ( this );
		
	}	//	constructor()

	doAll ( o ) {
		const sW = 'Guage doAll() ' + o.do;
	//	console.log ( sW );
		switch ( o.do ) {
			case 'set-value':
				this.setState ( { value: 	o.value,
								  valueLg :	o.valueLg  } );
				break;
			default:
				console.error ( sW + ': unrecognized do' );
		}
		return null;
	}	//	doAll()

	render() {
		let p = this.props;
		let s = this.state;
		let value = typeof s.valueLg  === 'number' ? s.valueLg  : s.value;

		let th = 10;
		let th2 = th / 2;

		let scal_max = p.max;
		let scal_rng = p.max - p.min;

		let grad_min = p.h - th2;
		let grad_max = th + th2;
		let grad_rng = grad_min - grad_max;
		let grad_zro = grad_max + ((scal_max / scal_rng) * grad_rng);

		let scal_dst = p.max - value;

		let grad_val = grad_max + ((scal_dst / scal_rng) * grad_rng);

		let vy = 0, vh = 0;

		if ( grad_val > grad_zro ) {
			vy = grad_zro;
		//	vh = grad_val - grad_zro - th2; }
			vh = grad_val - grad_zro; }
		else {
		//	vy = grad_val + th2 + 2;
		//	vh = grad_zro - grad_val - th2 - 2; }
			vy = grad_val;
			vh = grad_zro - grad_val; }
			
		return (
			<g transform = {'translate ( ' + p.x + ', ' + p.y + ' )'} >
				<rect width = {p.w} 
					  height = {p.h}
					  fill = 'white' 
					  stroke = 'gray'
					  strokeWidth = '0.0' />
				<text x = '0' y = { th }> 
					{ p.title } 
				</text>
				<rect x = '0' width = '4'
					  y = { vy }  height = { vh }
					  fill = 'gray' />
				<rect x = '0' width = '60'
					  y = { grad_val - 2 }  height = { th2 + 3 }
					  fill = 'white' />
				<text x = '0' y = { grad_val + th2 } > 
					{'' + s.value }
				</text>
			</g>
		);
	}	//	render()

	componentDidMount() {
		const sW = 'Guage componentDidMount()';
		console.log ( sW );

		if ( this.props.fncJointData ) {
			this.props.fncJointData ( { do:	'set-call-down',
										what:	this.props.title,
										fnc:	this.doAll	} ); }
	}	//	componentDidMount()


	componentWillUnmount() {
		const sW = 'Guage componentWillUnmount()';
		console.log ( sW );

	}	//	componentWillUnmount()

	componentDidUpdate ( prevProps ) {
		let sW = 'Guage componentDidUpdate()';
	//	console.log ( sW );

	}	//	componentDidUpdate()

}	//	class Guage

export { Guage as default };

/*
export (function () { 

	'use strict';


	return guage;

})();
*/
