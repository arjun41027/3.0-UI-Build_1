(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[4348],{74348:(e,a,i)=>{"use strict";i.r(a),i.d(a,{DeviceType:()=>y,PhoneViewer:()=>w,Tiptap:()=>b,default:()=>k});var s,t=i(95155),l=i(91992),n=i(37206),r=i(79581),c=i.n(r),d=i(12115),o=i(77928),m=i(57094),h=i(38323),p=i(5772);function x({children:e,open:a,setOpenAction:i}){let s=(0,d.useRef)(null);return(0,d.useEffect)(()=>{a?(s.current.style.display="flex",document.body.classList.add("modal-open")):(s.current.style.display="none",document.body.classList.remove("modal-open"))},[a]),(0,t.jsxs)("div",{className:"modal-cont",ref:s,children:[(0,t.jsx)("div",{className:"modal-over",onClick:()=>{a&&i(!1)}}),(0,t.jsxs)("div",{className:"body-modal",children:[(0,t.jsx)("button",{type:"button",className:"modal-close-btn",onClick:e=>{e.preventDefault(),i(!1)},children:"✕"}),e]})]})}function u({onImageSelect:e,onImagesSelect:a,isOpen:i,onClose:s,uploadedImageUrls:l=[],selectedImageUrls:n=[],multiSelect:r=!1}){let{t:c}=(0,o.Bd)(),[m,h]=(0,d.useState)([]),[u,v]=(0,d.useState)({});return d.useEffect(()=>{i&&(h([]),v(e=>{let a={...e};return l.forEach(e=>{e in a||(a[e]=!0)}),a}))},[i,l]),(0,t.jsx)(x,{open:i,setOpenAction:s,children:(0,t.jsxs)("div",{className:"image-picker-container",children:[(0,t.jsx)("div",{className:"image-picker-header",children:(0,t.jsx)("h2",{className:"image-picker-title",children:c("selectAnImage")})}),(0,t.jsx)("div",{className:"image-picker-content",children:0===l.length?(0,t.jsx)("div",{className:"image-picker-empty",children:(0,t.jsx)("p",{className:"image-picker-empty-text",children:c("noImagesFound")})}):(0,t.jsx)("div",{className:"image-picker-grid",children:l.map((e,a)=>{let i=m.includes(e);return(0,t.jsxs)("div",{className:`image-picker-item ${i?"image-picker-item--selected":""}`,onClick:()=>!u[e]&&void(console.log("imageUrl",e),r?h(a=>a.includes(e)?a.filter(a=>a!==e):[...a,e]):h([e])),children:[u[e]&&(0,t.jsx)("div",{className:"image-picker-loader",children:(0,t.jsx)("div",{className:"spinner"})}),(0,t.jsx)(p.default,{src:e,alt:`Uploaded Image ${a+1}`,className:`image-picker-img ${u[e]?"image-hidden":""}`,width:300,height:200,unoptimized:!0,onLoadingComplete:()=>{v(a=>({...a,[e]:!1}))}}),i&&(0,t.jsx)("div",{className:"image-picker-selected-overlay",children:(0,t.jsx)("span",{className:"image-picker-check",children:"✓"})})]},`uploaded-${a}`)})})}),(0,t.jsxs)("div",{className:"image-picker-footer",children:[(0,t.jsx)("button",{className:"image-picker-btn image-picker-btn--cancel",onClick:()=>{h([]),s()},type:"button",children:c("Cancel")}),(0,t.jsx)("button",{className:"image-picker-btn image-picker-btn--confirm",onClick:()=>{m.length&&(r&&a&&a(m),e&&e(m[0]),s())},disabled:!m.length,type:"button",children:c("insertImage")})]})]})})}i(90708);var v=i(31738);let j=(0,n.default)(async()=>{let{default:e}=await i.e(6241).then(i.bind(i,46241));e.Quill.register("modules/imageResize",c());let a=({forwardedRef:a,...i})=>(0,t.jsx)(e,{ref:a,...i});return a.displayName="ReactQuill",a},{loadableGenerated:{webpack:()=>[46241]},ssr:!1,loading:()=>(0,t.jsx)(v.Ay,{})}),g={toolbar:[[{header:[1,2,3,4,5,6,!1]}],["bold","italic","underline","strike"],[{list:"ordered"},{list:"bullet"}],[{indent:"-1"},{indent:"+1"}],[{color:[]},{background:[]}],["blockquote","code-block","link","image"],[{align:[]}],["clean"]],imageResize:{parchment:j.Quill?.import("parchment"),modules:["Resize","DisplaySize"]},clipboard:{matchVisual:!1}},N=["header","bold","italic","underline","strike","list","indent","link","image","color","background","align","blockquote","code-block"],b=({funcChange:e,fnSubjectChange:a,subValue:i,contentValue:s,bodyKey:l,disabled:n,fnHtmlChange:r,dir:c,form:m,uploadedImageUrls:h=[],selectedAssetImageUrls:p=[],onImagesSelected:x,hideImageButton:v=!1,showCharacterCount:b=!0,showHtmlToggle:f=!0})=>{let{t:y}=(0,o.Bd)(),[w,k]=(0,d.useState)(s||""),[E,S]=(0,d.useState)(!1),[T,L]=(0,d.useState)(0),[$,C]=(0,d.useState)(!1),[F,M]=(0,d.useState)([]);(0,d.useEffect)(()=>{Array.isArray(p)&&M(e=>JSON.stringify(e)===JSON.stringify(p)?e:p)},[p]);let A=(0,d.useRef)(null);return(0,d.useEffect)(()=>{if(void 0!==s&&s!==w&&(k(s),!n&&!E)&&A.current)try{let e=A.current.getEditor();e.root.innerHTML!==s&&e.clipboard.dangerouslyPasteHTML(s)}catch(e){console.log("Error updating editor content:",e)}},[s,E,w,n]),(0,d.useEffect)(()=>{if(A.current&&!E)try{let e=A.current.getEditor().getText()||"";L(e.length>0?e.length-1:0)}catch(e){}},[w,E]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("style",{children:`
        .editor-wrapper .ql-editor img {
          display: inline-block;
          vertical-align: middle;
          max-width: 100%;
          height: auto;
        }
      `}),(0,t.jsxs)("div",{className:"editor-wrapper",children:[(0,t.jsxs)("div",{className:"text-editor-button",children:[f&&(0,t.jsx)("button",{type:"button",onClick:()=>{if(E){if(A.current)try{A.current.getEditor().clipboard.dangerouslyPasteHTML(w)}catch(e){console.log("Error setting HTML content:",e)}}else if(A.current)try{let e=A.current.getEditor().root.innerHTML;k(e)}catch(e){console.log("Error getting HTML content:",e)}S(!E)},className:E?"is-active":"",title:E?"Switch to Editor":"View HTML",children:E?"\uD83D\uDCDD Editor":"\uD83D\uDD27 HTML"}),!v&&(0,t.jsxs)("button",{type:"button",onClick:()=>C(!0),title:y("Add Image"),children:["\uD83D\uDDBC️ ",y("image")]})]}),E?(0,t.jsx)("div",{className:"input_html-editor",dir:c,children:(0,t.jsx)("textarea",{placeholder:"\uD83D\uDCBB Enter HTML here...",onChange:a=>{let i=a.target.value;k(i),e(i),r(i)},value:w,dir:c,readOnly:n,style:{textAlign:"rtl"===c?"right":"left"}})}):(0,t.jsx)("div",{className:`quill-editor-wrapper ${"rtl"===c?"quill-rtl":"quill-ltr"}`,dir:c,children:(0,t.jsx)(j,{ref:A,value:(e=>{if(!e||!e.includes("&lt;"))return e;let a=document.createElement("textarea");return a.innerHTML=e,a.value})(w),onChange:a=>{if(!n&&(k(a),e(a),A.current))try{let e=A.current.getEditor().getText()||"";L(e.length>0?e.length-1:0)}catch(e){console.log("Error getting text length:",e)}},readOnly:n,modules:g,formats:N,placeholder:`✍️ ${y("Enter text content here")}...`,className:"rtl"===c?"ql-rtl":"ql-ltr"})}),b&&(0,t.jsx)("div",{className:"editor-status-bar",children:(0,t.jsx)("div",{className:"character-count",children:(0,t.jsxs)("span",{children:[T," ",y("characters")]})})})]}),!v&&(0,t.jsx)(u,{isOpen:$,onClose:()=>C(!1),onImagesSelect:a=>{if(a&&a.length){if(M(a),x&&x(a),A.current&&!E)try{let e=A.current.getEditor(),i=e.getSelection(!0),s=i?i.index:e.getLength();a.forEach(a=>{e.insertEmbed(s,"image",a),s+=1}),e.setSelection(s)}catch(e){console.log("Error inserting images:",e)}else if(E){let i=w+a.map(e=>`<img src="${e}" alt="Selected image" style="max-width: 100%; height: auto;" />`).join("");k(i),e(i),r(i)}}},selectedImageUrls:F,multiSelect:!0,uploadedImageUrls:h})]})},f=e=>{if(!e)return!1;let a=e.replace(/<[^>]*>/g,"");return/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(a)};var y=((s={}).iPhone="iphone",s.Samsung="samsung",s.Huawei="huawei",s.OnePlus="oneplus",s.iPad="ipad",s.Tablet="tablet",s);let w=({subValue:e,dir:a,contentValue:i,form:s,type:n=0,autoOpen:r=!1,classes:c=""})=>{let{t:p}=(0,o.Bd)(),u=()=>new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!1}),[v,j]=d.useState(u()),[g,N]=d.useState(!1),[b,y]=d.useState("iphone");d.useEffect(()=>{let e=setInterval(()=>{j(u())},6e4);return()=>clearInterval(e)},[]),d.useEffect(()=>{let e=()=>{N(window.innerWidth<=768)};return e(),window.addEventListener("resize",e),()=>window.removeEventListener("resize",e)},[]);let w=e=>{let a=document.createElement("textarea");return a.innerHTML=e,a.value},k=e=>{if(!e)return"";let a=w(e);return l.default.sanitize(a,{ALLOWED_TAGS:["p","img","b","i","strong","em","br","h1","h2","h3","h4","h5","h6","div","span","section","article","header","footer","main","table","thead","tbody","tfoot","tr","td","th","caption","ul","ol","li","dl","dt","dd","blockquote","pre","code","a","button","form","input","label","select","textarea","video","audio","source","picture","figure","figcaption","canvas","svg","style"],ALLOWED_ATTR:["src","alt","style","class","id","href","target","rel","width","height","border","cellpadding","cellspacing","colspan","rowspan","align","valign","bgcolor","background","dir","lang","title","data-*","aria-*","role","data","name","value","placeholder","action","method","type","checked","disabled","selected"],KEEP_CONTENT:!0}).replace(/<img([^>]*)>/g,'<img$1 style="max-width:100%;height:auto;display:block;" />')},E=e=>e||({1:1,2:2,3:4,4:5})[s?.watch("type")],S=({type:a})=>{let s=T?"rtl":"";switch(E(a)){case 1:return(0,t.jsxs)("div",{className:`sms-app ${s}`,children:[(0,t.jsxs)("div",{className:"device-header",children:[(0,t.jsx)("span",{className:"align-item-center",children:(0,t.jsx)(m.m6W,{})}),(0,t.jsxs)("p",{className:"device-header-title",children:[(0,t.jsx)("span",{className:"device-header-title_avatar",children:T?"م":"C"}),(0,t.jsx)("span",{className:"device-header-title_name",children:p("Contact")})]}),(0,t.jsx)("span",{className:"edit-head",children:"⋮"})]}),(0,t.jsx)("div",{className:"tiptap-content-inner",children:i?.trim().length>0&&(0,t.jsxs)("div",{className:"sms-body",children:[(0,t.jsx)("p",{style:{whiteSpace:"pre-wrap",margin:0},children:i}),(0,t.jsx)("span",{className:"chat-time",children:"09:42"})]})})]});case 2:let l;return(0,t.jsx)("div",{className:`email-app ${s}`,children:(0,t.jsxs)("div",{className:"email-content-container",children:[(0,t.jsx)("div",{className:"email-subject-line",children:(0,t.jsx)("h2",{children:e||(T?"بدون موضوع":"")})}),(0,t.jsxs)("div",{className:"email-meta",children:[(0,t.jsxs)("div",{className:"email-sender",children:[(0,t.jsx)("div",{className:"sender-avatar",children:T?"م":"S"}),(0,t.jsxs)("div",{className:"sender-details",children:[(0,t.jsxs)("p",{className:"sender-name",children:[T?"المرسل":p("Sender")," ",(0,t.jsx)("span",{className:"sender-email",children:p("sender@example.com")})]}),(0,t.jsx)("p",{className:"sender-to",children:T?"إلى: أنا":`${p("To")}: me`})]})]}),(0,t.jsx)("div",{className:"email-time",children:"09:41 AM"})]}),(0,t.jsx)("div",{className:"email-body",children:(0,t.jsx)("iframe",{className:"email-preview-iframe",title:e||"Email Preview",srcDoc:(l=w(i||""),`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />

      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
      />

      <style>
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          overflow-x: hidden !important;
          background-color: #f4f4f4 !important;
          font-family: Arial, sans-serif !important;
          -webkit-text-size-adjust: 100%;
        }

        body {
          min-width: 100% !important;
        }

        table {
          border-collapse: collapse !important;
        }

        img {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          border: 0 !important;
        }

        a {
          text-decoration: none;
        }

        td,
        div,
        p,
        span {
          word-break: break-word;
        }

        body > table {
          width: 100% !important;
          max-width: 600px !important;
          margin: 0 auto !important;
          background-color: #ffffff !important;
        }

        @media only screen and (max-width: 600px) {
          html,
          body {
            width: 100% !important;
            overflow-x: hidden !important;
          }

          body > table {
            width: 100% !important;
            max-width: 100% !important;
          }

          table {
            width: 100% !important;
          }

          td {
            word-break: break-word !important;
          }
        }
      </style>
    </head>

    <body>
      ${l}
    </body>
  </html>
  `),sandbox:"allow-same-origin",scrolling:"no"})})]})});case 4:return(0,t.jsx)("div",{className:`notification-app ${s}`,children:(0,t.jsx)("div",{className:"notification-container",children:(0,t.jsx)("div",{className:"notification-card",children:(0,t.jsxs)("div",{className:"notification-content",children:[(0,t.jsxs)("div",{className:"notification-header",children:[(0,t.jsxs)("span",{className:"app-name",children:[(0,t.jsx)("div",{className:"notification-app-icon",children:"\uD83D\uDCF1"}),e||(T?"تطبيق":"App")]}),(0,t.jsx)("span",{className:"notification-time",children:"now"})]}),(0,t.jsx)("div",{className:"notification-body",children:i?.split("<p></p>").join("").trim().length>0?(0,t.jsx)("div",{dangerouslySetInnerHTML:{__html:k(i)}}):(0,t.jsx)("p",{children:T?"محتوى الإشعار هنا":p("Notification content here")})})]})})})});case 5:return(0,t.jsxs)("div",{className:`inbox-app ${s}`,children:[(0,t.jsx)("div",{className:"device-header",children:(0,t.jsxs)("div",{className:"inbox-header-container",children:[(0,t.jsxs)("div",{className:"inbox-title",children:[(0,t.jsx)("span",{className:"inbox-icon",children:"\uD83D\uDCE7"}),(0,t.jsx)("span",{className:"inbox-text",children:T?"البريد الوارد":"Inbox"})]}),(0,t.jsxs)("div",{className:"inbox-actions",children:[(0,t.jsx)("span",{className:"inbox-action",children:"\uD83D\uDD0D"}),(0,t.jsx)("span",{className:"inbox-action",children:"⋮"})]})]})}),(0,t.jsxs)("div",{className:"inbox-filter-tabs",children:[(0,t.jsx)("div",{className:"filter-tab active",children:T?"الأساسي":"Primary"}),(0,t.jsx)("div",{className:"filter-tab",children:T?"الترويج":"Promotions"}),(0,t.jsx)("div",{className:"filter-tab",children:T?"التحديثات":"Updates"})]}),(0,t.jsx)("div",{className:"inbox-email-list",children:(0,t.jsxs)("div",{className:"email-item unread selected",children:[(0,t.jsx)("div",{className:"email-avatar",children:T?"م":"S"}),(0,t.jsxs)("div",{className:"email-content",children:[(0,t.jsxs)("div",{className:"email-header",children:[(0,t.jsx)("span",{className:"email-sender-name",children:T?"المرسل":"Sender"}),(0,t.jsxs)("div",{className:"email-meta",children:[(0,t.jsx)("span",{className:"email-time",children:"09:42"}),(0,t.jsx)("span",{className:"email-star",children:"⭐"})]})]}),(0,t.jsx)("div",{className:"email-subject",children:e||(T?"بدون موضوع":"")}),(0,t.jsx)("div",{className:"email-preview",children:i?(0,t.jsx)("span",{dangerouslySetInnerHTML:{__html:k(i).replace(/<[^>]*>/g,"").substring(0,50)+"..."}}):(0,t.jsx)("span",{children:T?"معاينة محتوى البريد الإلكتروني هنا...":"Email content preview here..."})}),(0,t.jsx)("div",{className:"email-labels",children:(0,t.jsx)("span",{className:"email-label",children:T?"مهم":"Important"})})]})]})}),(0,t.jsx)("div",{className:"inbox-bottom-actions",children:(0,t.jsxs)("span",{className:"compose-fab",children:[(0,t.jsx)("span",{className:"compose-icon",children:"✏️"}),(0,t.jsx)("span",{children:T?"إنشاء":"Compose"})]})})]});default:return(0,t.jsxs)("div",{className:`email-app ${s}`,children:[(0,t.jsxs)("div",{className:"device-header",children:[(0,t.jsxs)("span",{className:"align-item-center",children:[(0,t.jsx)(m.m6W,{}),T?"البريد الوارد":"Inbox"]}),(0,t.jsx)("p",{className:"device-header-title",children:T?"البريد":"Mail"}),(0,t.jsx)("span",{className:"edit-head",children:T?"تحرير":"Edit"})]}),(0,t.jsx)("div",{className:"tiptap-content-inner",children:(0,t.jsx)("div",{dangerouslySetInnerHTML:{__html:k(i)}})})]})}},T=a?"rtl"===a:f(i)||f(e),L=E(n),[$,C]=(0,d.useState)(r);return r?(0,t.jsxs)("div",{className:`editor-device-view ${T?"rtl":""} device-${b} ${2===L?"email-document-device":""}`,children:[(0,t.jsxs)("div",{className:`device-notch ${b}`,children:[(0,t.jsx)("div",{className:"device-time",children:v}),"iphone"===b&&(0,t.jsxs)("div",{className:"dynamic-island",children:[(0,t.jsx)("div",{className:"device-cam"}),(0,t.jsx)("div",{className:"cam-lens"})]}),"ipad"===b&&(0,t.jsx)("div",{className:"tablet-cam-container",children:(0,t.jsx)("div",{className:"tablet-cam"})}),"ipad"!==b&&"tablet"!==b&&(0,t.jsxs)("span",{className:"device-item-container",children:[(0,t.jsx)(h.mOS,{className:"device-item"}),(0,t.jsx)(h.X2q,{className:"device-item",style:{color:"iphone"===b?"#6dff7e":"#ffffff"}})]})]}),(0,t.jsx)(S,{type:n})]}):(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("button",{type:"button",className:`preview-btn ${c}`,onClick:e=>{e.preventDefault(),C(!0)},children:p("Preview Message on Device")}),(0,t.jsx)(x,{open:$,setOpenAction:C,children:(0,t.jsxs)("div",{className:`editor-device-view ${T?"rtl":""} device-${b} ${2===L?"email-document-device":""}`,children:[(0,t.jsxs)("div",{className:`device-notch ${b}`,children:[(0,t.jsx)("div",{className:"device-time",children:v}),"iphone"===b&&(0,t.jsxs)("div",{className:"dynamic-island",children:[(0,t.jsx)("div",{className:"device-cam"}),(0,t.jsx)("div",{className:"cam-lens"})]}),"ipad"===b&&(0,t.jsx)("div",{className:"tablet-cam-container",children:(0,t.jsx)("div",{className:"tablet-cam"})}),"ipad"!==b&&"tablet"!==b&&(0,t.jsxs)("span",{className:"device-item-container",children:[(0,t.jsx)(h.mOS,{className:"device-item"}),(0,t.jsx)(h.X2q,{className:"device-item",style:{color:"iphone"===b?"#6dff7e":"#ffffff"}})]})]}),(0,t.jsx)(S,{type:n})]})})]})},k=b},90708:()=>{}}]);