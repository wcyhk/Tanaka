export const FACILITIES=Object.freeze({toilet:'廁所／潔具',plumbing:'供排水設備',lighting:'照明',aircon:'冷氣',projector:'投影設備',computer:'電腦',door:'門窗'});
export const STATUSES=Object.freeze({new:'待處理',working:'處理中',waiting:'等待跟進',completed:'已完成',cancelled:'已取消'});
export const PRIORITIES=Object.freeze({normal:'一般',urgent:'緊急'});
export const DEFAULT_LOCATIONS=Object.freeze([
 {id:'demo-hall',name:'示範禮堂',active:true,facilities:['lighting','aircon','projector','door']},
 {id:'demo-restroom',name:'示範洗手間',active:true,facilities:['toilet','plumbing','lighting','door']},
 {id:'demo-computer-room',name:'示範電腦室',active:true,facilities:['computer','lighting','aircon','projector','door']}
]);
export const DEFAULT_ISSUES=Object.freeze([
 {id:'toilet-leak',name:'廁所／潔具漏水',active:true,requiredFacilities:['toilet','plumbing']},
 {id:'light',name:'照明異常',active:true,requiredFacilities:['lighting']},
 {id:'aircon',name:'冷氣異常',active:true,requiredFacilities:['aircon']},
 {id:'projector',name:'投影設備故障',active:true,requiredFacilities:['projector']},
 {id:'computer',name:'電腦故障',active:true,requiredFacilities:['computer']},
 {id:'door',name:'門窗損壞',active:true,requiredFacilities:['door']},
 {id:'general',name:'其他維修事項',active:true,requiredFacilities:[]}
]);
export function compatible(location,issue){
 return !!location?.active&&!!issue?.active&&Array.isArray(location.facilities)&&Array.isArray(issue.requiredFacilities)&&issue.requiredFacilities.every(f=>location.facilities.includes(f));
}
export function validateReport({location,issue,description,priority}){
 if(!location?.active)return '請選擇有效地點。';
 if(!issue?.active)return '請選擇有效維修分類。';
 if(!compatible(location,issue))return '這個地點沒有此分類需要的設施，請重新選擇。';
 if(typeof description!=='string'||description.trim().length<5||description.trim().length>2000)return '請填寫 5 至 2000 字的情況說明。';
 if(!Object.hasOwn(PRIORITIES,priority))return '請選擇有效緊急程度。';
 return '';
}
export function csvCell(value){let text=String(value??'');if(/^[\s]*[=+\-@]/u.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function reportCsv(tickets){return '\ufeff'+[['編號','地點','維修分類','情況說明','緊急程度','狀態','回報者','處理備註'],...tickets.map(t=>[t.id,t.locationName,t.issueTypeName,t.description,PRIORITIES[t.priority]??t.priority,STATUSES[t.status]??t.status,t.reporterName,t.staffNote])].map(row=>row.map(csvCell).join(',')).join('\r\n');}
