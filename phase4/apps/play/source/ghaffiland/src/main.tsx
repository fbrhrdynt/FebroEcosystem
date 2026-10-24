import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles/theme.css';
class Boundary extends React.Component<{children:React.ReactNode},{failed:boolean}> {
 state={failed:false}; static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<main><h1>Yuk, mulai lagi.</h1><p>Permainan terhenti. Muat ulang untuk kembali bermain.</p><button onClick={()=>location.reload()}>Buka kembali</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<Boundary><App/></Boundary>);
