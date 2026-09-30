import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { Laptop, Clock3, ShieldCheck, Headphones, MapPin, CalendarDays, CreditCard, Moon, CheckCircle2, Wrench, LogIn, LayoutDashboard } from 'lucide-react'
import { supabase, demoMode } from './supabase'
import './styles.css'

const RATE = 50
const OVERNIGHT_RATE = 500
const BUSINESS_START = 8
const BUSINESS_END = 17
const PHONE = '09628637697'
const DEMO_KEY = 'laptophub_demo_bookings'
const laptops = Array.from({length:10},(_,i)=>({id:i+1,name:`Laptop ${String(i+1).padStart(2,'0')}`}))

function getDemoBookings(){ try{return JSON.parse(localStorage.getItem(DEMO_KEY)||'[]')}catch{return[]} }
function saveDemoBookings(x){localStorage.setItem(DEMO_KEY,JSON.stringify(x))}
function parseLocal(s){return new Date(s)}
function overlap(aStart,aEnd,bStart,bEnd){return aStart < bEnd && bStart < aEnd}
function laptopAvailability(bookings,date,start,end,type){
  const s=new Date(`${date}T${String(start).padStart(2,'0')}:00:00`)
  let e
  if(type==='overnight') { const next=new Date(s); next.setDate(next.getDate()+1); e=new Date(`${next.toISOString().slice(0,10)}T08:00:00`) }
  else e=new Date(`${date}T${String(end).padStart(2,'0')}:00:00`)
  return laptops.map(l=>({ ...l, available:!bookings.some(b=>b.laptop_id===l.id && ['pending','confirmed','active'].includes(b.status) && overlap(s,e,new Date(b.start_at),new Date(b.end_at))) }))
}
function money(n){return `₱${Number(n).toLocaleString('en-PH')}`}
function today(){return new Date().toISOString().slice(0,10)}

async function loadBookings(){
 if(demoMode) return getDemoBookings()
 const {data,error}=await supabase.from('bookings').select('*').order('start_at',{ascending:true})
 if(error) throw error
 return data||[]
}
async function insertBooking(payload){
 if(demoMode){ const b={...payload,id:crypto.randomUUID(),created_at:new Date().toISOString(),status:'pending'}; const all=getDemoBookings(); saveDemoBookings([...all,b]); return b }
 const {data,error}=await supabase.rpc('create_booking',payload)
 if(error) throw error
 return data
}

function Nav(){
 const loc=useLocation();
 return <nav className="nav"><Link className="brand" to="/"><img src="/assets/laptophub-logo.jpg"/><span><strong>Laptop<span style={{color:'#20bfff'}}>Hub</span> PH</strong><small>RENT • STUDY • SUCCEED</small></span></Link><div className="navlinks"><Link to="/"><button className={loc.pathname==='/'?'active':''}>Reserve</button></Link><Link to="/laptops"><button className={loc.pathname==='/laptops'?'active':''}>Laptops</button></Link><Link to="/admin"><button className={loc.pathname==='/admin'?'active':''}><LayoutDashboard size={14} style={{verticalAlign:'-2px'}}/> Admin</button></Link></div></nav>
}
function Footer(){return <footer className="footer"><div className="footer-inner"><div><b>LaptopHub PH</b><div><small>Melvi Building, Jose Abad Santos Avenue, City of San Fernando, Pampanga</small></div></div><div><b>₱50 / hour</b><div><small>Students • for academic use</small></div></div><div><b>{PHONE}</b><div><small>SMS / Viber • Cash / GCash</small></div></div></div></footer>}

function Home(){
 const [bookings,setBookings]=useState([])
 const [date,setDate]=useState(today())
 const [type,setType]=useState('hourly')
 const [start,setStart]=useState(8)
 const [hours,setHours]=useState(1)
 const [name,setName]=useState('')
 const [phone,setPhone]=useState('')
 const [age,setAge]=useState('')
 const [idType,setIdType]=useState('')
 const [payment,setPayment]=useState('gcash')
 const [agree,setAgree]=useState(false)
 const [selected,setSelected]=useState('')
 const [busy,setBusy]=useState(false)
 const [toast,setToast]=useState('')
 const navigate=useNavigate()
 useEffect(()=>{loadBookings().then(setBookings).catch(()=>{})},[])
 useEffect(()=>{if(type==='overnight'){setStart(17);setHours(15);setSelected('')}else{setStart(8);setHours(1);setSelected('')}},[type])
 const end=type==='hourly'?Math.min(start+Number(hours),BUSINESS_END):8
 const available=useMemo(()=>laptopAvailability(bookings,date,start,end,type),[bookings,date,start,end,type])
 const availableCount=available.filter(x=>x.available).length
 const total=type==='hourly'?Number(hours)*RATE:OVERNIGHT_RATE
 const canSubmit=!!name&&!!phone&&!!selected&&agree&&(type==='hourly'||(Number(age)>=18&&idType))
 async function reserve(){
  if(!canSubmit)return
  setBusy(true); setToast('')
  try{
   const s = type==='hourly'?`${date}T${String(start).padStart(2,'0')}:00:00`:`${date}T17:00:00`
   const next=new Date(`${date}T17:00:00`); if(type==='overnight')next.setDate(next.getDate()+1)
   const e=type==='hourly'?`${date}T${String(end).padStart(2,'0')}:00:00`:`${next.toISOString().slice(0,10)}T08:00:00`
   const b=await insertBooking({p_customer_name:name,p_phone:phone,p_age:type==='overnight'?Number(age):null,p_id_type:type==='overnight'?idType:null,p_rental_type:type,p_laptop_id:Number(selected),p_start_at:s,p_end_at:e,p_hours:type==='hourly'?Number(hours):15,p_total:total,p_payment_method:payment})
   setToast(`Reservation ${b?.booking_code||b?.id?.slice?.(0,8)||''} submitted.`)
   const refreshed=await loadBookings();setBookings(refreshed);setSelected('');
   setTimeout(()=>setToast(''),5000)
  }catch(e){setToast(e.message||'Reservation failed. Please try again.')}
  finally{setBusy(false)}
 }
 return <>
 <section className="hero"><div className="hero-inner"><div><div className="badges"><span className="badge">10 laptops available</span><span className="badge">8 AM – 5 PM</span><span className="badge">Overnight 5 PM – 8 AM</span></div><h1>Reserve your <span>Laptop</span> in minutes.</h1><p>Choose your date, rental hours, and a laptop. LaptopHub PH shows which units are ready for rent before you confirm.</p><div className="inline"><a href="#reserve"><button className="btn btn-primary">Reserve a slot</button></a><Link to="/laptops"><button className="btn btn-secondary">View availability</button></Link></div></div><img className="hero-image" src="/assets/laptophub-banner.jpg"/></div></section>
 <main className="container" id="reserve"><div className="section-title"><div><h2>Make a reservation</h2><p>Hourly rental is ₱50/hour. Take-home overnight is for customers 18+ with a valid ID.</p></div>{demoMode&&<span className="demo">DEMO MODE</span>}</div>
 <div className="booking-layout"><div className="card"><div className="tabs"><button className={type==='hourly'?'sel':''} onClick={()=>setType('hourly')}><Clock3 size={14} style={{verticalAlign:'-2px'}}/> Hourly</button><button className={type==='overnight'?'sel':''} onClick={()=>setType('overnight')}><Moon size={14} style={{verticalAlign:'-2px'}}/> Overnight</button></div><br/>
 <div className="form-grid"><div className="field"><label>Date</label><input type="date" min={today()} value={date} onChange={e=>setDate(e.target.value)}/></div>
 {type==='hourly'?<><div className="field"><label>Start time</label><select value={start} onChange={e=>setStart(Number(e.target.value))}>{Array.from({length:9},(_,i)=>8+i).map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}</select></div><div className="field"><label>How many hours?</label><select value={hours} onChange={e=>setHours(Number(e.target.value))}>{Array.from({length:17-start},(_,i)=>i+1).map(h=><option key={h} value={h}>{h} hour{h>1?'s':''}</option>)}</select></div></>:<div className="field"><label>Overnight schedule</label><input value="5:00 PM → 8:00 AM" readOnly/></div>}
 <div className="field full"><label>Pick an available laptop</label><div className="grid" style={{gridTemplateColumns:'repeat(5,1fr)'}}>{available.map(l=><button key={l.id} className={`choice ${selected===String(l.id)?'sel':''}`} disabled={!l.available} onClick={()=>setSelected(String(l.id))}><Laptop size={18}/><br/><b>{l.name}</b><br/><small>{l.available?'Ready':'Booked'}</small></button>)}</div></div>
 <div className="field"><label>Your name</label><input placeholder="Juan Dela Cruz" value={name} onChange={e=>setName(e.target.value)}/></div><div className="field"><label>Mobile number</label><input placeholder="09xxxxxxxxx" value={phone} onChange={e=>setPhone(e.target.value)}/></div>
 {type==='overnight'&&<><div className="field"><label>Age</label><input type="number" min="18" placeholder="18+" value={age} onChange={e=>setAge(e.target.value)}/></div><div className="field"><label>Valid ID</label><select value={idType} onChange={e=>setIdType(e.target.value)}><option value="">Select ID</option><option>Driver's License</option><option>National ID / PhilSys</option><option>Passport</option><option>School ID + supporting ID</option><option>Other government-issued ID</option></select></div></>}
 <div className="field full"><label>Payment method</label><div className="choice-row"><button className={`choice ${payment==='gcash'?'sel':''}`} onClick={()=>setPayment('gcash')}><CreditCard size={18}/> <b>GCash</b><br/><small>{PHONE}</small></button><button className={`choice ${payment==='cash'?'sel':''}`} onClick={()=>setPayment('cash')}><CreditCard size={18}/> <b>Cash</b><br/><small>Pay at pickup / release</small></button></div></div>
 <div className="field full"><label className="checkbox"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/><span>I confirm the information is correct. For overnight take-home, I understand that a valid ID and age 18+ are required before release.</span></label></div>
 <div className="field full"><button className="btn btn-primary btn-full" disabled={!canSubmit||busy||availableCount===0} onClick={reserve}>{busy?'Submitting…':`Reserve ${selected?laptops.find(x=>x.id===Number(selected))?.name:''}`}</button></div></div></div>
 <aside className="card summary"><h3>Reservation summary</h3><div className="summary-line"><span>Rental</span><b>{type==='hourly'?'Hourly':'Overnight'}</b></div><div className="summary-line"><span>Schedule</span><b>{type==='hourly'?`${String(start).padStart(2,'0')}:00 – ${String(end).padStart(2,'0')}:00`:'5:00 PM – 8:00 AM'}</b></div><div className="summary-line"><span>Duration</span><b>{type==='hourly'?`${hours} hour${hours>1?'s':''}`:'15 hours'}</b></div><div className="summary-line"><span>Available now</span><b>{availableCount}/10</b></div><div className="total">{money(total)}</div><p className="muted">{type==='hourly'?'₱50 × number of hours':'Overnight rate (configurable in admin/database)'}</p>{type==='overnight'?<div className="notice warning"><ShieldCheck size={16} style={{verticalAlign:'-3px'}}/> Take-home release requires age 18+ and a valid ID. The ID is checked before release.</div>:<div className="notice success"><CheckCircle2 size={16} style={{verticalAlign:'-3px'}}/> Choose any laptop marked <b>Ready</b>. Your selected unit is held for the reservation period.</div>}</aside></div></main></>}

function Laptops(){
 const [bookings,setBookings]=useState([]);const [date,setDate]=useState(today());const [start,setStart]=useState(8);const [hours,setHours]=useState(1)
 useEffect(()=>{loadBookings().then(setBookings)},[])
 const end=Math.min(start+hours,17);const av=laptopAvailability(bookings,date,start,end,'hourly')
 return <main className="container"><div className="section-title"><div><h2>Laptop availability</h2><p>Pick a date and time to see which of the 10 units are ready.</p></div></div><div className="card"><div className="form-grid"><div className="field"><label>Date</label><input type="date" min={today()} value={date} onChange={e=>setDate(e.target.value)}/></div><div className="field"><label>Start</label><select value={start} onChange={e=>setStart(Number(e.target.value))}>{Array.from({length:9},(_,i)=>8+i).map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}</select></div><div className="field"><label>Hours</label><select value={hours} onChange={e=>setHours(Number(e.target.value))}>{Array.from({length:17-start},(_,i)=>i+1).map(h=><option key={h} value={h}>{h}</option>)}</select></div></div></div><br/><div className="grid">{av.map(l=><div className="card laptop-card" key={l.id}><div className="laptop-top"><div className="laptop-icon"><Laptop/></div><span className={`status ${l.available?'available':'reserved'}`}>{l.available?'READY':'RESERVED'}</span></div><h3>{l.name}</h3><p className="muted">Academic rental • ₱50/hour</p><Link to="/#reserve"><button className="btn btn-primary btn-full">Reserve this unit</button></Link></div>)}</div></main>
}

function Admin(){
 const [bookings,setBookings]=useState([]);const [toast,setToast]=useState('');const [loading,setLoading]=useState(true)
 async function refresh(){setLoading(true);try{setBookings(await loadBookings())}catch(e){setToast(e.message)}finally{setLoading(false)}}
 useEffect(()=>{refresh()},[])
 async function status(id,status){
  if(demoMode){saveDemoBookings(getDemoBookings().map(b=>b.id===id?{...b,status}:b));refresh();return}
  const {error}=await supabase.from('bookings').update({status}).eq('id',id);if(error)setToast(error.message);else refresh()
 }
 const counts={pending:bookings.filter(b=>b.status==='pending').length,confirmed:bookings.filter(b=>b.status==='confirmed').length,active:bookings.filter(b=>b.status==='active').length,completed:bookings.filter(b=>b.status==='completed').length}
 return <main className="container"><div className="section-title"><div><h2>Admin dashboard</h2><p>Manage reservations, laptop status, and releases.</p></div>{demoMode&&<span className="demo">DEMO DATA SAVED IN THIS BROWSER</span>}</div><div className="admin-grid"><div className="stat"><b>{bookings.length}</b><span>Total reservations</span></div><div className="stat"><b>{counts.pending}</b><span>Pending</span></div><div className="stat"><b>{counts.confirmed}</b><span>Confirmed</span></div><div className="stat"><b>{counts.active}</b><span>Currently active</span></div></div><br/><div className="card"><div className="section-title"><div><h3>Reservations</h3><p>Approve bookings before releasing a laptop.</p></div><button className="btn btn-secondary" onClick={refresh}>{loading?'Loading…':'Refresh'}</button></div><div className="table-wrap"><table className="table"><thead><tr><th>Customer</th><th>Schedule</th><th>Unit</th><th>Type</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>{bookings.length===0?<tr><td colSpan="7" className="empty">No reservations yet.</td></tr>:bookings.map(b=><tr key={b.id}><td><b>{b.customer_name}</b><br/><span className="muted">{b.phone}{b.age?` • ${b.age} yrs`:''}{b.id_type?` • ${b.id_type}`:''}</span></td><td>{new Date(b.start_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}<br/>→ {new Date(b.end_at).toLocaleString('en-PH',{timeStyle:'short'})}</td><td>Laptop {String(b.laptop_id).padStart(2,'0')}</td><td>{b.rental_type}</td><td>{b.payment_method}<br/><b>{money(b.total)}</b></td><td><span className={`status ${b.status==='confirmed'?'available':b.status==='pending'?'reserved':b.status==='active'?'available':b.status==='maintenance'?'maintenance':'rented'}`}>{b.status}</span></td><td><div className="inline">{b.status==='pending'&&<button className="btn btn-primary" onClick={()=>status(b.id,'confirmed')}>Confirm</button>}{b.status==='confirmed'&&<button className="btn btn-primary" onClick={()=>status(b.id,'active')}>Release</button>}{b.status==='active'&&<button className="btn btn-secondary" onClick={()=>status(b.id,'completed')}>Complete</button>}</div></td></tr>)}</tbody></table></div></div></main>
}

function App(){return <div className="app"><Nav/><Routes><Route path="/" element={<Home/>}/><Route path="/laptops" element={<Laptops/>}/><Route path="/admin" element={<Admin/>}/></Routes><Footer/></div>}
createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>)
