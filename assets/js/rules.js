"use strict";
/* AI Usage Guardian — bộ gợi ý dựa trên quy tắc (AI_TOOL_CATALOG + TASK_TAXONOMY trong main_AI.py) */
/* ============================== Bộ gợi ý công cụ (dựa trên quy tắc, minh bạch) */
const SRC_KW=["tìm nguồn","nguồn","tài liệu","reference","research","source"];
function recommendTools(topic,text,preferred){
  topic=(topic||"general").toLowerCase(); const t=norm(text); const pref=new Set(preferred||[]);
  const catScore={};
  for(const c of TOOL_CATEGORIES){ let s=c.topics.includes(topic)?5:0; const hits=c.kw.filter(k=>t.includes(k)).length; s+=Math.min(hits,3)*3; catScore[c.key]=s; }
  const sc=[];
  for(const name of TOOL_NAMES){ const o=TOOLS[name];
    let s=Math.max(...o.cats.map(k=>catScore[k]));
    const hits=o.kw.filter(k=>t.includes(k)).length; s+=Math.min(hits,3)*4;
    if(topic==="academic"&&SRC_KW.some(k=>t.includes(k))){ if(name==="Perplexity AI") s+=8; else if(name==="Claude") s+=5; }
    if(FEATURED.has(name)) s+=1.5; if(pref.has(name)) s+=1;
    if(s>=5) sc.push([s,name]); }
  sc.sort((x,y)=>y[0]-x[0]||(x[1]<y[1]?-1:x[1]>y[1]?1:0)); return sc.slice(0,3).map(x=>x[1]);
}
function toolCategoryName(name){const o=TOOLS[name]; if(!o) return ""; const c=CAT_BY_KEY[o.cats[0]]; return lang==="vi"?c.vi:c.en;}
function recommendationReason(topic,text,tool){
  const t=norm(text);
  if(topic==="academic"&&tool==="Perplexity AI"&&SRC_KW.some(k=>t.includes(k))) return lang==="vi"?"Bạn chọn Academic và task có nhu cầu tìm nguồn/tài liệu → Perplexity được ưu tiên vì tập trung tìm kiếm web và cung cấp nguồn.":"You chose Academic and the task needs sources → Perplexity comes first because it searches the web and cites sources.";
  const o=TOOLS[tool]; return o?o.fn:"";
}

/* ============================== TASK_TAXONOMY (33 rule groups) */
const TAX=[
 [["tìm ref","tìm tài liệu","research","tìm nguồn","tổng hợp thông tin"],"well","AI tổng hợp nhanh lượng lớn thông tin có sẵn, tiết kiệm thời gian tra cứu.","AI quickly synthesizes large amounts of existing info, saving research time."],
 [["viết content","viết caption","viết bài","soạn nội dung","draft nội dung"],"well","AI tạo nhanh nhiều phương án nháp để bạn chọn lọc và chỉnh sửa lại.","AI drafts multiple quick options for you to pick from and edit."],
 [["dịch thuật","dịch ","translate"],"well","AI dịch nhanh, chính xác về mặt ngữ nghĩa cơ bản, phù hợp cho bản nháp.","AI translates fast with solid basic accuracy, good for a first draft."],
 [["tóm tắt","rút gọn","summary"],"well","AI xử lý văn bản dài rất nhanh và vẫn giữ được ý chính.","AI processes long text very fast while keeping the main ideas."],
 [["brainstorm","lên ý tưởng","gợi ý ý tưởng"],"well","AI đưa nhiều hướng ý tưởng đa dạng để tham khảo, kích thích tư duy.","AI offers many diverse idea directions to spark your thinking."],
 [["sửa chính tả","sửa lỗi","rà soát","proofread","ngữ pháp"],"well","AI phát hiện lỗi nhanh, độ chính xác cao với văn bản thông thường.","AI catches errors fast, with high accuracy on ordinary text."],
 [["outline","lên khung","dàn ý","lập kế hoạch sơ bộ"],"well","AI giỏi tổ chức cấu trúc logic cho một kế hoạch từ yêu cầu rõ ràng.","AI is good at structuring a plan logically from a clear brief."],
 [["phân tích số liệu","thống kê","tính toán","excel"],"well","AI xử lý tính toán, tổng hợp số liệu nhanh và ít sai sót cơ học.","AI handles calculations and data aggregation fast with fewer mechanical errors."],
 [["đọc hàng nghìn","xử lý dữ liệu lớn","big data","phân loại phản hồi","phân loại review","quét dữ liệu","lọc dữ liệu"],"well","Con người giới hạn về trí nhớ/tốc độ đọc; AI xử lý được lượng dữ liệu rất lớn trong thời gian ngắn.","Humans are limited by memory/reading speed; AI can process very large volumes of data quickly."],
 [["tạo nhiều phương án","tạo biến thể","generate nhiều","so sánh nhiều lựa chọn","tối ưu logistics","tối ưu tuyến đường","mô phỏng kịch bản"],"well","AI có thể thử hàng nghìn phương án cùng lúc và tìm ra lời giải tối ưu mà con người không làm kịp.","AI can try thousands of combinations at once and find an optimal solution faster than a human can."],
 [["dự báo","demand forecast","dự đoán xu hướng","dự đoán nhu cầu"],"well","AI dựa trên dữ liệu quá khứ để dự báo xu hướng rất nhanh, nhưng quyết định cuối vẫn cần con người.","AI is fast at forecasting trends from historical data, though the final call still needs a human."],
 [["cá nhân hoá","cá nhân hóa","personalize","gợi ý sản phẩm theo khách hàng","recommendation"],"well","AI cá nhân hoá trải nghiệm cho từng người ở quy mô lớn mà con người không thể làm thủ công.","AI personalizes experiences at a scale no human could manage manually."],
 [["nhận diện pattern","phát hiện bất thường","phát hiện gian lận","fraud","phân loại email","nhập dữ liệu","kiểm tra hoá đơn","kiểm tra hóa đơn","scan tài liệu","công việc lặp lại"],"well","Đây là việc lặp lại/nhận diện pattern — AI không biết chán, phù hợp để tự động hoá.","Repetitive, pattern-based work — AI doesn't get bored, so it's a good fit to automate."],
 [["thiết kế","design","làm poster","làm banner"],"moderate","AI hỗ trợ ý tưởng/bố cục nhưng thường cần chỉnh tay để khớp bộ nhận diện thương hiệu.","AI helps with ideas/layout but usually needs manual tweaks to match brand identity."],
 [["kịch bản video","storyboard","quay dựng"],"moderate","AI gợi ý cấu trúc nhưng cảm xúc, nhịp điệu thực tế cần con người tinh chỉnh.","AI suggests structure, but real pacing and emotion need a human touch."],
 [["chiến lược nội dung","target audience","insight khách hàng"],"moderate","AI thiếu hiểu biết sâu, cập nhật về bối cảnh và tâm lý cụ thể của đối tượng.","AI lacks deep, up-to-date understanding of a specific audience's context."],
 [["viết email cho đối tác","soạn tin nhắn khách hàng","trả lời khách hàng","chăm sóc khách hàng"],"moderate","AI viết nhanh bản nháp nhưng giọng điệu/quan hệ với từng khách cần con người tinh chỉnh.","AI drafts quickly, but tone and the relationship with each customer need a human touch."],
 [["lên kế hoạch dự án","quản lý deadline","phân tích rủi ro"],"moderate","AI hỗ trợ tổ chức thông tin nhưng người quản lý vẫn cần nắm bối cảnh thực tế và ưu tiên.","AI helps organize information, but the manager still needs real-world context to prioritize."],
 [["định vị thương hiệu","quyết định chiến lược","chiến lược thương hiệu"],"weak","Đòi hỏi đánh giá bối cảnh thị trường thực tế và trách nhiệm mà AI không gánh thay được.","Requires real market judgement and accountability AI cannot take on."],
 [["đàm phán","làm việc với đối tác","gọi tài trợ","thương lượng"],"weak","Cần sự tinh tế trong giao tiếp và xây dựng quan hệ thực tế — AI không thay thế được.","Needs real relationship-building and communication finesse — AI can't replace that."],
 [["bản quyền","pháp lý","nhạy cảm văn hoá","nhạy cảm văn hóa","kiểm duyệt"],"weak","Rủi ro pháp lý/văn hoá cần con người chịu trách nhiệm; AI có thể bỏ sót ngữ cảnh địa phương.","Legal/cultural risk needs human accountability; AI may miss local context."],
 [["duyệt bài","phê duyệt","duyệt cuối","final review"],"weak","Đây là bước quyết định cuối cùng, cần con người chịu trách nhiệm và đảm bảo phù hợp thực tế.","This is the final call — a human needs to own it and confirm real-world fit."],
 [["họp team","quản lý nhóm","phân công công việc","quản lý nhân sự"],"weak","Yếu tố con người, cảm xúc và động lực đội nhóm không thể giao cho AI.","Human factors, emotion and team motivation can't be delegated to AI."],
 [["xác định mục tiêu","đặt objective","quyết định why","định hướng chiến lược"],"weak","AI tối ưu tốt mục tiêu đã cho, nhưng quyết định mục tiêu nào đáng được theo đuổi là value judgment của con người.","AI is good at optimizing a given goal, but choosing which goal is worth pursuing is a human value judgment."],
 [["đạo đức","cân nhắc rủi ro đạo đức","ảnh hưởng xã hội","quyết định nhạy cảm"],"weak","Vấn đề đạo đức đòi hỏi phán đoán giá trị và trách nhiệm mà AI không thể gánh thay.","Ethical calls require value judgment and accountability that AI cannot take on."],
 [["đồng cảm","an ủi","tư vấn tâm lý","lắng nghe cảm xúc","empathy"],"weak","AI có thể mô phỏng empathy nhưng không thực sự trải qua cảm xúc — cần sự đồng cảm thật của con người.","AI can simulate empathy but doesn't truly feel it — this needs a human's real empathy."],
 [["trực giác","cảm nhận thị trường","linh cảm"],"weak","Trực giác con người hình thành từ kinh nghiệm sống và context xã hội mà AI không có.","Human intuition is shaped by lived experience and social context that AI doesn't have."],
 [["đọc ngữ cảnh văn hoá","đọc ngữ cảnh văn hóa","hiểu ẩn ý","hiểu ngữ cảnh xã hội"],"weak","Hiểu ẩn ý/văn hoá địa phương sâu cần trải nghiệm sống thực tế, không chỉ phân tích ngôn ngữ.","Reading local cultural subtext needs real lived experience, not just language analysis."],
 [["xây dựng mối quan hệ","xây dựng lòng tin","networking","chăm sóc mối quan hệ"],"weak","Quan hệ/lòng tin được xây từ thời gian và sự gắn bó thực sự giữa người với người.","Relationships and trust are built through real time and commitment between people."],
 [["chịu trách nhiệm","ký quyết định","chịu trách nhiệm pháp lý","chịu hậu quả"],"weak","AI không thể chịu trách nhiệm pháp lý/đạo đức cho một quyết định — con người phải là người ký.","AI can't bear legal or moral responsibility for a decision — a human has to own it."],
 [["ý tưởng đột phá","phá vỡ quy tắc","đặt lại câu hỏi","đổi mới mô hình","sáng tạo ý nghĩa"],"weak","AI tối ưu trên pattern có sẵn; đặt lại câu hỏi về chính hệ thống là năng lực của con người.","AI optimizes within existing patterns; questioning the system itself is a human capability."],
 [["quyết định trong bất định","chấp nhận ambiguity","quyết định mơ hồ","chưa rõ đáp án"],"weak","Nhiều quyết định không có đáp án toán học rõ ràng — cần con người cân nhắc và sống với sự không chắc chắn.","Many decisions have no clean, formulaic answer — a human needs to weigh trade-offs and live with uncertainty."],
 [["đọc người","đọc đối tác","body language","lãnh đạo đội nhóm","leadership","truyền cảm hứng"],"weak","Đọc người trong đàm phán và truyền cảm hứng/lãnh đạo đội nhóm cần sự hiện diện và tin cậy thực sự của con người.","Reading people in negotiation, and inspiring/leading a team, need a human's real presence and trust."],
];
function classifySubtask(text){const l=norm(text); for(let i=0;i<TAX.length;i++) for(const kw of TAX[i][0]) if(l.includes(kw)) return {level:TAX[i][1],rule:i}; return {level:"unknown",rule:-1};}
function reasonOf(it){return it.rule>=0?TAX[it.rule][lang==="vi"?2:3]:t("reason_unknown");}

