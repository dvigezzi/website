import { config, isConfigured } from "./config.js";
import { initializeAuth, signIn, signOut, apiRequest } from "./auth.js";
const $ = id => document.getElementById(id);
$('year').textContent = new Date().getFullYear();
const show = (id, yes=true) => $(id).classList.toggle('hidden',!yes);
const message = (id,text,kind='status') => { $(id).textContent=text; $(id).className=kind; };
function slugify(s){return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,180);}
function clearForm(){ $('post-form').reset(); $('post-id').value=''; $('form-heading').textContent='New article'; $('save').textContent='Save article'; }
function fillForm(p){ $('post-id').value=p.id; $('title').value=p.title; $('slug').value=p.slug; $('category').value=p.category||''; $('excerpt').value=p.excerpt||''; $('content').value=p.content||''; $('tags').value=(p.tags||[]).join(', '); $('status').value=p.status; $('form-heading').textContent='Edit article'; $('save').textContent='Update article'; window.scrollTo({top:0,behavior:'smooth'}); }
let accessGranted=false;
async function loadPosts(){
  const data=await apiRequest('/api/admin/posts',{},true);
  const list=$('admin-posts');
  if(!data.posts.length){list.textContent='No posts yet. Create your first article.';return;}
  list.innerHTML='';
  for(const p of data.posts){
    const row=document.createElement('div');row.className='post-row';
    const details=document.createElement('div');const strong=document.createElement('strong');strong.textContent=p.title;const small=document.createElement('small');small.textContent=`${p.status.toUpperCase()} · ${p.slug}`;details.append(strong,small);
    const actions=document.createElement('div');actions.className='actions';
    const edit=document.createElement('button');edit.className='button';edit.textContent='Edit';edit.addEventListener('click',()=>fillForm(p));
    const del=document.createElement('button');del.className='button danger';del.textContent='Delete';del.addEventListener('click',async()=>{if(!confirm(`Delete “${p.title}”? This cannot be undone.`))return;try{await apiRequest(`/api/admin/posts/${p.id}`,{method:'DELETE'},true);await loadPosts();if($('post-id').value===p.id)clearForm();}catch(e){alert(e.message);}});
    actions.append(edit,del);row.append(details,actions);list.append(row);
  }
}
async function refresh(){
  try{
    const app=await initializeAuth();
    const account=app.getActiveAccount();
    if(!account){
      show('signed-out');show('workspace',false);
      if(new URLSearchParams(location.search).get('login')==='1') await signIn();
      return;
    }
    show('signed-out',false);show('workspace');$('account-label').textContent=account.username||account.name||'Signed-in Microsoft account';
    try{await loadPosts();accessGranted=true;show('denied',false);show('editor-area');message('authorization-status','Administrator access verified.','success');}
    catch(e){accessGranted=false;show('editor-area',false);show('denied');message('authorization-status',e.message,'error');}
  }catch(e){show('signed-out');message('auth-status',e.message,'error');}
}
if(!isConfigured){show('config-warning');$('config-warning').textContent='Setup required: edit /blog/assets/config.js with your Microsoft tenant ID, application client ID and API URL. Follow README.md before deploying.';$('sign-in').disabled=true;}
$('sign-in').addEventListener('click',async()=>{try{message('auth-status','Redirecting to Microsoft…');await signIn();}catch(e){message('auth-status',e.message,'error');}});
$('sign-out').addEventListener('click',()=>signOut());
$('new-post').addEventListener('click',clearForm);
$('title').addEventListener('input',()=>{if(!$('post-id').value)$('slug').value=slugify($('title').value);});
$('post-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!accessGranted)return;
  const id=$('post-id').value;
  const payload={title:$('title').value.trim(),slug:slugify($('slug').value),category:$('category').value.trim(),excerpt:$('excerpt').value.trim(),content:$('content').value,tags:$('tags').value.split(',').map(x=>x.trim()).filter(Boolean),status:$('status').value};
  try{await apiRequest(id?`/api/admin/posts/${id}`:'/api/admin/posts',{method:id?'PUT':'POST',body:JSON.stringify(payload)},true);message('form-status','Article saved successfully.','success');clearForm();await loadPosts();}
  catch(err){message('form-status',err.message,'error');}
});
refresh();
