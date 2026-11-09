import test,{before,after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,addDoc,updateDoc,deleteDoc,serverTimestamp,writeBatch} from 'firebase/firestore';
let env;
const claims=email=>({email,email_verified:true,name:'示範使用者',firebase:{sign_in_provider:'google.com'}});
const database=(uid='member',email='member@example.test')=>env.authenticatedContext(uid,claims(email)).firestore();
const ticket=(overrides={})=>({locationId:'restroom',issueTypeId:'toilet-leak',locationName:'測試洗手間',issueTypeName:'廁所漏水',description:'測試水箱接口持續漏水',priority:'normal',status:'new',reporterUid:'member',reporterName:'示範使用者',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),staffNote:'',...overrides});
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-tanaka',firestore:{host:'127.0.0.1',port:8080,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});await env.clearFirestore();await env.withSecurityRulesDisabled(async context=>{const db=context.firestore(),batch=writeBatch(db);for(const [path,data]of Object.entries({'admins/admin@example.test':{email:'admin@example.test',active:true},'locations/hall':{name:'測試禮堂',active:true,facilities:['lighting','projector']},'locations/restroom':{name:'測試洗手間',active:true,facilities:['toilet','plumbing']},'locations/disabled':{name:'已停用地點',active:false,facilities:['toilet','plumbing']},'issueTypes/toilet-leak':{name:'廁所漏水',active:true,requiredFacilities:['toilet','plumbing']},'tickets/existing':{...ticket(),createdAt:new Date(),updatedAt:new Date()},'Case/legacy':{Remark:'舊資料'}}))batch.set(doc(db,path),data);await batch.commit();});});
after(async()=>await env.cleanup());
test('anonymous visitors cannot read maintenance records',async()=>{await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(),'tickets')))});
test('verified Google users from any email domain can read all new records',async()=>{await assertSucceeds(getDocs(collection(database(),'tickets')))});
test('unverified accounts cannot read records',async()=>{await assertFails(getDocs(collection(env.authenticatedContext('unverified',{...claims('x@example.test'),email_verified:false}).firestore(),'tickets')))});
test('non-Google identities do not inherit Google access',async()=>{await assertFails(getDocs(collection(env.authenticatedContext('custom',{...claims('x@example.test'),firebase:{sign_in_provider:'custom'}}).firestore(),'tickets')))});
test('a normal user can submit a valid real-location repair',async()=>{await assertSucceeds(addDoc(collection(database(),'tickets'),ticket()))});
test('server rejects a toilet leak in a hall with no toilet',async()=>{await assertFails(addDoc(collection(database(),'tickets'),ticket({locationId:'hall',locationName:'測試禮堂'})))});
test('server rejects spoofed location snapshots',async()=>{await assertFails(addDoc(collection(database(),'tickets'),ticket({locationName:'假地點'})))});
test('server rejects inactive locations',async()=>{await assertFails(addDoc(collection(database(),'tickets'),ticket({locationId:'disabled',locationName:'已停用地點'})))});
test('users cannot impersonate another reporter or submit completed cases',async()=>{await assertFails(addDoc(collection(database(),'tickets'),ticket({reporterUid:'victim'})));await assertFails(addDoc(collection(database(),'tickets'),ticket({status:'completed'})))});
test('normal users cannot alter status or configuration',async()=>{await assertFails(updateDoc(doc(database(),'tickets/existing'),{status:'completed',updatedAt:serverTimestamp()}));await assertFails(setDoc(doc(database(),'locations/rogue'),{name:'非法地點',active:true,facilities:[],updatedAt:serverTimestamp()}))});
test('an active admin can update status but cannot rewrite original report',async()=>{const db=database('admin','admin@example.test');await assertSucceeds(updateDoc(doc(db,'tickets/existing'),{status:'working',staffNote:'已安排檢查',updatedAt:serverTimestamp()}));await assertFails(updateDoc(doc(db,'tickets/existing'),{reporterUid:'someone-else',updatedAt:serverTimestamp()}))});
test('only admins can list and change admin permissions',async()=>{await assertFails(getDocs(collection(database(),'admins')));await assertFails(setDoc(doc(database(),'admins/member@example.test'),{email:'member@example.test',active:true,updatedAt:serverTimestamp()}));await assertSucceeds(getDocs(collection(database('admin','admin@example.test'),'admins')))});
test('a user can check their own admin document without listing other emails',async()=>{await assertSucceeds(getDoc(doc(database(),'admins/member@example.test')));await assertFails(getDoc(doc(database(),'admins/admin@example.test')))});
test('an admin cannot accidentally disable their own access',async()=>{await assertFails(updateDoc(doc(database('admin','admin@example.test'),'admins/admin@example.test'),{active:false,updatedAt:serverTimestamp()}))});
test('legacy collections no longer expose unauthenticated data',async()=>{await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'Case/legacy')));await assertFails(getDoc(doc(database(),'Case/legacy')))});
test('optional Google name claims have a consistent empty fallback',async()=>{
 for(const name of [undefined,null,42]){const identity=claims('member@example.test');if(name===undefined)delete identity.name;else identity.name=name;const db=env.authenticatedContext('member',identity).firestore();await assertSucceeds(addDoc(collection(db,'tickets'),ticket({reporterName:''})));await assertFails(addDoc(collection(db,'tickets'),ticket({reporterName:'冒認名稱'})));}
});
test('server rejects forged names, dates and whitespace reports',async()=>{
 for(const overrides of [{reporterName:'另一人'},{createdAt:new Date(0)},{updatedAt:new Date(0)},{description:'          '}])await assertFails(addDoc(collection(database(),'tickets'),ticket(overrides)));
});
test('inactive and missing categories or locations cannot receive reports',async()=>{
 await env.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'issueTypes/disabled'),{name:'停用分類',active:false,requiredFacilities:[]});});
 for(const overrides of [{issueTypeId:'disabled',issueTypeName:'停用分類'},{issueTypeId:'missing'},{locationId:'missing'}])await assertFails(addDoc(collection(database(),'tickets'),ticket(overrides)));
});
test('revocation immediately removes server authority and admin list access',async()=>{
 await env.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),'admins/revoked@example.test'),{email:'revoked@example.test',active:true}));const db=database('revoked','revoked@example.test');await assertSucceeds(getDocs(collection(db,'admins')));
 await env.withSecurityRulesDisabled(context=>updateDoc(doc(context.firestore(),'admins/revoked@example.test'),{active:false}));await assertFails(getDocs(collection(db,'admins')));await assertFails(updateDoc(doc(db,'tickets/existing'),{status:'completed',updatedAt:serverTimestamp()}));await assertSucceeds(getDoc(doc(db,'admins/revoked@example.test')));
});
test('even administrators cannot permanently delete reports or configuration',async()=>{
 const db=database('admin','admin@example.test');for(const path of ['tickets/existing','locations/restroom','issueTypes/toilet-leak','admins/admin@example.test'])await assertFails(deleteDoc(doc(db,path)));
});
