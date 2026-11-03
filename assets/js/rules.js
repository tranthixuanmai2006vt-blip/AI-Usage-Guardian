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

/* ============================== TASK_TAXONOMY v2
   Mỗi nhóm: k = từ khoá (khớp theo ranh giới từ, có dấu hoặc không dấu), l = mức (well | moderate | weak), vi/en = lý do.
   Cách xếp mức: chấm điểm mọi nhóm khớp (cụm từ càng dài càng cụ thể → điểm càng cao), chọn nhóm điểm cao nhất,
   sau đó điều chỉnh theo tín hiệu ngữ cảnh (bản nộp/chấm điểm, dữ liệu nhạy cảm, bản nháp...). Không khớp nhóm nào
   → ước lượng theo động từ hành động; vẫn không có → mặc định Trung bình kèm lời nhắc tự kiểm tra. */
const TAX=[
 /* ---------- WELL: tra cứu & tổng hợp ---------- */
 {k:["tìm ref","tìm reference","tìm tài liệu","tìm nguồn","tìm kiếm thông tin","tra cứu","tìm hiểu","tìm thông tin","research","tổng hợp thông tin","tổng hợp tài liệu","thu thập thông tin","search","tìm bài báo","tìm paper","tìm số liệu","tìm case study","tìm ví dụ","tìm ý tưởng tham khảo","khảo sát nhanh thị trường"],l:"well",
  vi:"AI tổng hợp nhanh lượng lớn thông tin có sẵn và gợi ý nguồn, tiết kiệm nhiều thời gian tra cứu. Bạn vẫn cần mở nguồn gốc để xác minh — AI có thể bịa trích dẫn.",
  en:"AI quickly synthesizes large amounts of existing info and suggests sources, saving research time. Open the original sources to verify — AI can fabricate citations."},
 {k:["tóm tắt","rút gọn","summary","summarize","tóm lược","đọc nhanh tài liệu","tóm ý chính","ghi chú bài giảng","note bài giảng","tóm tắt cuộc họp","biên bản họp","meeting notes","ghi biên bản"],l:"well",
  vi:"AI xử lý văn bản dài rất nhanh và vẫn giữ được ý chính. Hãy đối chiếu lại các con số, tên riêng với bản gốc.",
  en:"AI processes long text very fast while keeping the main ideas. Cross-check numbers and names against the original."},
 {k:["giải thích khái niệm","giải thích lý thuyết","giải thích thuật ngữ","giải thích code","giải thích công thức","hiểu khái niệm","explain","định nghĩa","giải nghĩa","giảng lại","học khái niệm mới","ôn lý thuyết"],l:"well",
  vi:"AI giải thích lại một khái niệm theo nhiều cách, nhiều ví dụ và kiên nhẫn trả lời câu hỏi phụ — rất hợp để tự học. Đối chiếu với giáo trình khi gặp kiến thức chuyên sâu.",
  en:"AI can re-explain a concept many ways with examples and patiently answer follow-ups — great for self-study. Check against your textbook for advanced material."},
 {k:["ôn tập","ôn thi","tạo flashcard","flashcard","tạo câu hỏi ôn tập","tạo quiz","tạo đề luyện tập","luyện tập trắc nghiệm","học từ vựng","từ vựng","quiz"],l:"well",
  vi:"AI tạo nhanh câu hỏi ôn tập, flashcard và giải thích đáp án — giúp bạn tự kiểm tra kiến thức thay vì chỉ đọc lại.",
  en:"AI quickly generates practice questions, flashcards and answer explanations — so you test yourself instead of just rereading."},

 /* ---------- WELL: viết & ngôn ngữ ---------- */
 {k:["viết content","viết caption","caption","viết bài đăng","viết post","soạn nội dung","draft nội dung","viết nháp","bản nháp","draft","viết hashtag","hashtag","viết tiêu đề","đặt tiêu đề","viết slogan","slogan","headline","viết mô tả sản phẩm","mô tả sản phẩm","viết quảng cáo","viết ads","copywriting"],l:"well",
  vi:"AI tạo nhanh nhiều phương án nháp để bạn chọn lọc và chỉnh sửa lại theo giọng thương hiệu/của bạn.",
  en:"AI drafts multiple quick options for you to pick from and edit into your own or the brand's voice."},
 {k:["dịch thuật","dịch sang","dịch bài","dịch tài liệu","dịch văn bản","dịch caption","dịch email","dịch slide","bản dịch","translate","translation","dịch tiếng anh","dịch tiếng việt","dịch"],l:"well",
  vi:"AI dịch nhanh và khá chính xác về ngữ nghĩa cơ bản, phù hợp cho bản nháp. Văn bản pháp lý, hợp đồng hay nội dung nhạy cảm văn hoá vẫn cần người rà lại.",
  en:"AI translates fast with solid basic accuracy, good for a first draft. Legal, contractual or culturally sensitive text still needs human review."},
 {k:["sửa chính tả","chính tả","sửa lỗi ngữ pháp","ngữ pháp","grammar","rà soát lỗi","proofread","soát lỗi","rà soát chính tả","kiểm tra lỗi chính tả","sửa câu","chỉnh câu","diễn đạt lại","paraphrase","viết lại câu","rewrite","làm mượt văn","chỉnh văn phong"],l:"well",
  vi:"AI phát hiện lỗi chính tả, ngữ pháp và gợi ý diễn đạt nhanh với độ chính xác cao. Lưu ý: diễn đạt lại để né đạo văn vẫn là đạo văn.",
  en:"AI catches spelling and grammar errors and suggests rephrasing quickly and accurately. Note: paraphrasing to dodge plagiarism is still plagiarism."},
 {k:["định dạng","format","trình bày lại","căn lề","chuyển đổi định dạng","convert","chuẩn hoá trích dẫn","trích dẫn apa","apa","harvard","danh mục tài liệu tham khảo","reference list","citation","định dạng trích dẫn"],l:"well",
  vi:"Định dạng và chuẩn hoá trích dẫn là việc theo quy tắc rõ ràng — AI làm nhanh và đều tay. Hãy kiểm tra lại từng nguồn có thật hay không.",
  en:"Formatting and citation styling follow clear rules — AI does it fast and consistently. Still check that every source actually exists."},
 {k:["outline","lên khung","dàn ý","lập dàn ý","cấu trúc bài","khung bài","lập kế hoạch sơ bộ","mục lục","table of contents","sườn bài","bố cục bài"],l:"well",
  vi:"AI giỏi tổ chức cấu trúc logic cho một bài/kế hoạch từ yêu cầu rõ ràng. Bạn quyết định luận điểm chính.",
  en:"AI is good at structuring a piece or plan logically from a clear brief. You decide the core argument."},
 {k:["email thông thường","viết email xin","email xin nghỉ","email hỏi","email nhắc","email cảm ơn","email follow up","follow up email","viết thư cảm ơn","soạn thông báo","viết thông báo","thông báo nội bộ"],l:"well",
  vi:"Email/thông báo theo mẫu quen thuộc là việc AI soạn nhanh và đúng giọng. Đọc lại tên người nhận, ngày giờ trước khi gửi.",
  en:"Routine emails and announcements follow familiar templates AI drafts quickly. Recheck names, dates and times before sending."},

 /* ---------- WELL: ý tưởng ---------- */
 {k:["brainstorm","lên ý tưởng","gợi ý ý tưởng","tìm ý tưởng","nghĩ ý tưởng","ý tưởng chủ đề","đặt tên","nghĩ tên","gợi ý tên","naming","idea","ideas","mindmap","sơ đồ tư duy"],l:"well",
  vi:"AI đưa ra nhiều hướng ý tưởng đa dạng để tham khảo, kích thích tư duy. Chọn và phát triển ý tưởng nào là việc của bạn.",
  en:"AI offers many diverse idea directions to spark your thinking. Choosing and developing one is your job."},
 {k:["tạo nhiều phương án","tạo biến thể","generate nhiều","so sánh nhiều lựa chọn","so sánh các lựa chọn","so sánh sản phẩm","so sánh ưu nhược điểm","ưu nhược điểm","pros and cons","bảng so sánh","mô phỏng kịch bản","tối ưu logistics","tối ưu tuyến đường","tối ưu lịch"],l:"well",
  vi:"AI có thể liệt kê và so sánh rất nhiều phương án cùng lúc, nhanh hơn con người nhiều. Tiêu chí ưu tiên vẫn do bạn đặt.",
  en:"AI can list and compare many options at once, far faster than a human. You still set the priority criteria."},

 /* ---------- WELL: dữ liệu, số liệu, kỹ thuật ---------- */
 {k:["phân tích số liệu","phân tích dữ liệu","thống kê mô tả","thống kê","tính toán","excel","google sheets","bảng tính","công thức excel","hàm excel","pivot","vẽ biểu đồ","biểu đồ","chart","data analysis","xử lý số liệu","nhập số liệu","làm sạch dữ liệu","clean data","data cleaning"],l:"well",
  vi:"AI xử lý tính toán, viết công thức và tổng hợp số liệu nhanh, ít sai sót cơ học. Hãy kiểm tra lại vài dòng bằng tay và tự diễn giải ý nghĩa.",
  en:"AI handles calculations, formulas and data aggregation fast with fewer mechanical errors. Spot-check a few rows by hand and interpret the meaning yourself."},
 {k:["chạy hồi quy","hồi quy","regression","stata","spss","r studio","rstudio","eviews","kiểm định","kiểm định giả thuyết","cronbach","efa","cfa","sem","anova","t test","chi square","đọc kết quả hồi quy"],l:"moderate",
  vi:"AI viết lệnh và giải thích output thống kê rất tốt, nhưng chọn mô hình, kiểm tra giả định và diễn giải kết quả cho đúng bối cảnh nghiên cứu cần chính bạn hiểu và chịu trách nhiệm.",
  en:"AI writes commands and explains statistical output well, but choosing the model, checking assumptions and interpreting results for your study is on you."},
 {k:["đọc hàng nghìn","xử lý dữ liệu lớn","big data","phân loại phản hồi","phân loại review","phân loại bình luận","quét dữ liệu","lọc dữ liệu","phân tích cảm xúc bình luận","sentiment","phân tích comment","phân tích review"],l:"well",
  vi:"Con người giới hạn về trí nhớ và tốc độ đọc; AI xử lý được lượng dữ liệu rất lớn trong thời gian ngắn.",
  en:"Humans are limited by memory and reading speed; AI can process very large volumes of data quickly."},
 {k:["viết code","lập trình","code","coding","viết hàm","viết script","script","python","javascript","html","css","sql","viết query","tạo website","làm web","regex","boilerplate","viết test","unit test"],l:"well",
  vi:"AI viết code mẫu, hàm và truy vấn rất nhanh. Bạn phải chạy thử, đọc hiểu từng dòng và kiểm tra bảo mật trước khi dùng thật.",
  en:"AI writes sample code, functions and queries very fast. Run it, understand each line and check security before real use."},
 {k:["sửa bug","debug","fix bug","sửa lỗi code","lỗi code","báo lỗi","error","exception","tối ưu code","refactor"],l:"well",
  vi:"AI đọc thông báo lỗi và gợi ý nguyên nhân rất nhanh. Hãy hiểu vì sao bản sửa đúng thay vì chỉ dán vào.",
  en:"AI reads error messages and suggests causes very quickly. Understand why the fix works rather than just pasting it."},
 {k:["dự báo","forecast","demand forecast","dự đoán xu hướng","dự đoán nhu cầu","dự báo doanh số","dự báo nhu cầu"],l:"well",
  vi:"AI dựa trên dữ liệu quá khứ để dự báo xu hướng nhanh, nhưng quyết định cuối vẫn cần con người cân nhắc bối cảnh.",
  en:"AI is fast at forecasting trends from historical data, though the final call still needs human judgement of context."},
 {k:["cá nhân hoá","cá nhân hóa","personalize","personalization","gợi ý sản phẩm theo khách hàng","recommendation","phân khúc khách hàng tự động"],l:"well",
  vi:"AI cá nhân hoá trải nghiệm cho từng người ở quy mô lớn mà con người không thể làm thủ công.",
  en:"AI personalizes experiences at a scale no human could manage manually."},
 {k:["nhận diện pattern","phát hiện bất thường","phát hiện gian lận","fraud","phân loại email","nhập dữ liệu","data entry","kiểm tra hoá đơn","kiểm tra hóa đơn","scan tài liệu","ocr","trích xuất dữ liệu","công việc lặp lại","việc lặp lại","tự động hoá","tự động hóa","automation","điền form hàng loạt","đổi tên file hàng loạt","sắp xếp file"],l:"well",
  vi:"Đây là việc lặp lại / nhận diện pattern — AI không biết chán, phù hợp để tự động hoá. Kiểm tra mẫu ngẫu nhiên vài kết quả.",
  en:"Repetitive, pattern-based work — AI doesn't get bored, so it's a good fit to automate. Spot-check a random sample."},
 {k:["lập lịch","xếp lịch","lịch học","lịch làm việc","to do list","todo","danh sách việc","checklist","nhắc việc","sắp xếp thời gian biểu","thời gian biểu","timeline sơ bộ"],l:"well",
  vi:"AI sắp xếp nhanh danh sách việc, lịch và checklist từ thông tin bạn đưa. Bạn điều chỉnh theo năng lượng và ưu tiên thật của mình.",
  en:"AI quickly turns your info into to-do lists, schedules and checklists. Adjust them to your real energy and priorities."},

 /* ---------- WELL: hình ảnh & media đơn giản ---------- */
 {k:["tạo ảnh minh hoạ","ảnh minh hoạ","ảnh minh họa","tạo hình ảnh","generate ảnh","xoá phông","xóa phông","tách nền","remove background","phụ đề","tạo phụ đề","subtitle","chuyển giọng nói thành văn bản","transcribe","gỡ băng","speech to text","chuyển văn bản thành giọng nói","text to speech","lồng tiếng ai"],l:"well",
  vi:"Tạo ảnh minh hoạ, tách nền, tạo phụ đề, gỡ băng là việc AI làm nhanh và tốt. Kiểm tra bản quyền hình ảnh và soát lại phụ đề trước khi đăng.",
  en:"Illustrations, background removal, subtitles and transcription are fast, strong AI tasks. Check image rights and proofread subtitles before publishing."},

 /* ---------- MODERATE: học thuật cần tư duy của bạn ---------- */
 {k:["viết essay","viết tiểu luận","tiểu luận","essay","viết bài luận","bài luận","viết báo cáo","báo cáo","report","viết assignment","assignment","bài tập lớn","bài tập nhóm","viết bài nghiên cứu","bài nghiên cứu","nghiên cứu khoa học","nckh","viết paper"],l:"moderate",
  vi:"AI giúp lên dàn ý, gợi ý lập luận và sửa văn, nhưng luận điểm, phân tích và giọng văn phải là của bạn — đây cũng là phần được chấm điểm và quy định liêm chính học thuật áp dụng.",
  en:"AI helps outline, suggest arguments and polish wording, but the thesis, analysis and voice must be yours — that is what gets graded, and academic-integrity rules apply."},
 {k:["tổng quan tài liệu","literature review","lit review","tổng quan nghiên cứu","khoảng trống nghiên cứu","research gap","đọc paper","đọc bài báo khoa học","review tài liệu"],l:"moderate",
  vi:"AI tìm và tóm tắt bài báo nhanh, nhưng hay bịa trích dẫn và bỏ sót nghiên cứu mới. Việc xác định khoảng trống nghiên cứu cần bạn đọc trực tiếp các bài chính.",
  en:"AI finds and summarizes papers quickly but often fabricates citations and misses recent work. Identifying the research gap needs you to read the key papers yourself."},
 {k:["thiết kế bảng hỏi","bảng hỏi","questionnaire","thiết kế khảo sát","câu hỏi khảo sát","thang đo","xây dựng thang đo","phỏng vấn sâu","câu hỏi phỏng vấn","kịch bản phỏng vấn","thiết kế nghiên cứu","phương pháp nghiên cứu","mô hình nghiên cứu","giả thuyết nghiên cứu"],l:"moderate",
  vi:"AI gợi ý câu hỏi và thang đo tham khảo tốt, nhưng thiết kế phải bám đúng mô hình, đối tượng và bối cảnh của bạn — nên dựa trên thang đo đã được kiểm định trong tài liệu.",
  en:"AI suggests questions and reference scales well, but the design must fit your model, sample and context — prefer validated scales from the literature."},
 {k:["giải bài tập","bài tập về nhà","homework","giải toán","giải đề","làm bài tập","giải phương trình","chứng minh","bài tập kế toán","bài tập kinh tế lượng","case study"],l:"moderate",
  vi:"AI giải và giải thích từng bước rất hữu ích để học, nhưng hay sai ở bài nhiều bước. Hãy tự làm trước rồi dùng AI để đối chiếu và hiểu chỗ sai — chép đáp án sẽ mất chính kỹ năng cần cho bài thi.",
  en:"AI's step-by-step solutions are great for learning but often wrong on multi-step problems. Try first, then use AI to compare and understand mistakes — copying answers loses the skill you need for exams."},
 {k:["làm slide","slide","thuyết trình","bài thuyết trình","powerpoint","pptx","canva","gamma","deck","pitch deck"],l:"moderate",
  vi:"AI dựng nhanh khung slide và gợi ý bố cục, nhưng thông điệp chính, câu chuyện và cách trình bày phải do bạn quyết định để người nghe bị thuyết phục.",
  en:"AI quickly builds slide skeletons and layouts, but the key message, story and delivery must be yours to persuade the audience."},
 {k:["kịch bản thuyết trình","script thuyết trình","luyện thuyết trình","tập thuyết trình","speaker notes","chuẩn bị q&a","chuẩn bị câu hỏi phản biện","dự đoán câu hỏi","q&a"],l:"moderate",
  vi:"AI giúp viết kịch bản, dự đoán câu hỏi và góp ý cách nói, nhưng bạn phải tự hiểu sâu nội dung — khi bị hỏi trực tiếp, AI không đứng cạnh bạn.",
  en:"AI helps script, anticipate questions and critique delivery, but you must understand the content deeply — AI won't be next to you when you're questioned live."},
 {k:["viết cv","cv","resume","cover letter","thư xin việc","thư động lực","motivation letter","personal statement","bài luận học bổng","essay học bổng","sop","statement of purpose","hồ sơ học bổng","hồ sơ xin việc","linkedin"],l:"moderate",
  vi:"AI giúp sắp xếp ý và chau chuốt câu chữ, nhưng câu chuyện, thành tích và động lực phải thật và là của bạn — hội đồng tuyển chọn đọc ra văn AI chung chung rất nhanh.",
  en:"AI helps structure and polish, but the story, achievements and motivation must be real and yours — selection panels spot generic AI writing quickly."},

 /* ---------- MODERATE: sáng tạo & truyền thông ---------- */
 {k:["thiết kế","design","làm poster","poster","làm banner","banner","logo","thiết kế logo","nhận diện thương hiệu","key visual","mockup","giao diện","ui","ux","infographic","thumbnail"],l:"moderate",
  vi:"AI hỗ trợ ý tưởng/bố cục và tạo bản phác nhanh, nhưng thường cần chỉnh tay để khớp bộ nhận diện thương hiệu và tránh vi phạm bản quyền.",
  en:"AI helps with ideas, layout and quick drafts, but usually needs manual work to match brand identity and avoid copyright issues."},
 {k:["kịch bản video","kịch bản","storyboard","quay dựng","dựng video","edit video","video ngắn","tiktok","reels","podcast","làm video","quay video","teaser"],l:"moderate",
  vi:"AI gợi ý cấu trúc và lời thoại, cắt ghép thô, nhưng cảm xúc, nhịp điệu và gu thẩm mỹ thực tế cần con người tinh chỉnh.",
  en:"AI suggests structure, lines and rough cuts, but real pacing, emotion and taste need a human touch."},
 {k:["viết truyện","sáng tác","viết thơ","làm thơ","viết lời bài hát","sáng tác nhạc","viết văn sáng tạo","creative writing","truyện ngắn"],l:"moderate",
  vi:"AI có thể gợi mở ý tưởng và câu chữ, nhưng tác phẩm sáng tạo có giá trị khi mang trải nghiệm và giọng riêng của bạn.",
  en:"AI can spark ideas and phrasing, but creative work has value when it carries your own experience and voice."},
 {k:["chiến lược nội dung","content plan","kế hoạch nội dung","lịch đăng bài","content calendar","target audience","insight khách hàng","insight","chân dung khách hàng","persona","phân tích đối thủ","đối thủ cạnh tranh","phân tích swot","swot","pestel","phân tích thị trường","nghiên cứu thị trường","4p","stp"],l:"moderate",
  vi:"AI cho khung phân tích và bản nháp nhanh, nhưng thiếu hiểu biết sâu, cập nhật về thị trường và tâm lý đối tượng cụ thể — cần dữ liệu thật và nhận định của bạn.",
  en:"AI gives quick frameworks and drafts but lacks deep, current understanding of the market and audience — you need real data and your own judgement."},
 {k:["kế hoạch marketing","marketing plan","kế hoạch truyền thông","chiến dịch","campaign","imc","media plan","ngân sách marketing","kpi","kế hoạch sự kiện","tổ chức sự kiện","event"],l:"moderate",
  vi:"AI giúp lên khung kế hoạch, timeline và gợi ý hoạt động, nhưng ngân sách, nguồn lực và mức độ khả thi phải do người nắm thực tế quyết định.",
  en:"AI helps with plan structure, timelines and activity ideas, but budget, resources and feasibility need someone who knows the real situation."},

 /* ---------- MODERATE: công việc & giao tiếp ---------- */
 {k:["viết email cho đối tác","email cho đối tác","email khách hàng","soạn tin nhắn khách hàng","tin nhắn khách hàng","trả lời khách hàng","chăm sóc khách hàng","customer service","cskh","trả lời inbox","trả lời bình luận","báo giá","gửi báo giá","phản hồi khiếu nại","xử lý khiếu nại","email cho giảng viên","email cho thầy cô","nhắn tin cho thầy cô"],l:"moderate",
  vi:"AI viết nhanh bản nháp, nhưng giọng điệu và mối quan hệ với từng người nhận cần con người tinh chỉnh — đặc biệt khi có khiếu nại hoặc người nhận có vị thế cao hơn.",
  en:"AI drafts quickly, but tone and the relationship with each recipient need a human touch — especially for complaints or senior recipients."},
 {k:["lên kế hoạch dự án","kế hoạch dự án","quản lý dự án","quản lý deadline","deadline","phân tích rủi ro","đánh giá rủi ro","lập kế hoạch","kế hoạch","plan","roadmap","timeline dự án","gantt"],l:"moderate",
  vi:"AI hỗ trợ tổ chức thông tin và đề xuất các bước, nhưng người quản lý vẫn cần nắm bối cảnh thực tế, nguồn lực và thứ tự ưu tiên.",
  en:"AI helps organize information and propose steps, but the owner still needs real context, resources and priorities."},
 {k:["mô hình kinh doanh","business model","kế hoạch kinh doanh","business plan","định giá sản phẩm","pricing","dự toán chi phí","ngân sách","tài chính dự án","phân tích tài chính","báo cáo tài chính","dòng tiền"],l:"moderate",
  vi:"AI dựng khung và tính toán nhanh, nhưng giả định đầu vào (giá, chi phí, nhu cầu) phải dựa trên dữ liệu thật — sai giả định thì con số đẹp đến đâu cũng vô nghĩa.",
  en:"AI builds frameworks and calculates fast, but input assumptions (price, cost, demand) must come from real data — wrong assumptions make polished numbers meaningless."},
 {k:["học ngoại ngữ","luyện speaking","luyện nói","luyện writing","luyện viết ielts","ielts","toeic","luyện phát âm","học tiếng anh","học tiếng"],l:"moderate",
  vi:"AI là bạn luyện tập và sửa lỗi kiên nhẫn, nhưng kỹ năng chỉ hình thành khi bạn tự nói, tự viết — để AI viết hộ sẽ không tiến bộ.",
  en:"AI is a patient practice partner and corrector, but skills only build when you speak and write yourself — letting AI write for you won't help."},
 {k:["tư vấn sức khoẻ","sức khoẻ","sức khỏe","triệu chứng","chế độ ăn","tập luyện","dinh dưỡng","tư vấn tài chính cá nhân","đầu tư","chứng khoán","crypto","tư vấn pháp luật","hỏi luật"],l:"moderate",
  vi:"AI cung cấp thông tin nền tham khảo, nhưng không thay được chuyên gia (bác sĩ, luật sư, cố vấn tài chính) khi quyết định ảnh hưởng thật đến bạn.",
  en:"AI gives useful background information but can't replace a professional (doctor, lawyer, financial adviser) when the decision really affects you."},
 {k:["chọn đề tài","chọn chủ đề","chọn hướng nghiên cứu","định hướng đề tài","chọn ngành","chọn nghề","định hướng nghề nghiệp","career","chọn trường","du học"],l:"moderate",
  vi:"AI giúp liệt kê lựa chọn và tiêu chí so sánh, nhưng lựa chọn cuối cần gắn với mối quan tâm, năng lực và hoàn cảnh thật của bạn.",
  en:"AI helps list options and comparison criteria, but the final choice must reflect your real interests, abilities and circumstances."},

 /* ---------- WEAK: quyết định, trách nhiệm, con người ---------- */
 {k:["định vị thương hiệu","quyết định chiến lược","chiến lược thương hiệu","brand positioning","tầm nhìn sứ mệnh","giá trị cốt lõi"],l:"weak",
  vi:"Đòi hỏi đánh giá bối cảnh thị trường thực tế và trách nhiệm mà AI không gánh thay được.",
  en:"Requires real market judgement and accountability AI cannot take on."},
 {k:["đàm phán","làm việc với đối tác","gọi tài trợ","xin tài trợ","kêu gọi tài trợ","nhà tài trợ","thương lượng","negotiate","negotiation","chốt deal","chốt hợp đồng","gặp khách hàng","gặp đối tác","gọi điện cho khách","sales call","bán hàng trực tiếp"],l:"weak",
  vi:"Cần sự tinh tế trong giao tiếp và xây dựng quan hệ thực tế — AI chỉ chuẩn bị được, không đứng ra thay bạn được.",
  en:"Needs real relationship-building and communication finesse — AI can help prepare, but can't stand in for you."},
 {k:["bản quyền","pháp lý","hợp đồng","điều khoản","nhạy cảm văn hoá","nhạy cảm văn hóa","kiểm duyệt","tuân thủ","compliance","quy định pháp luật","rà soát hợp đồng"],l:"weak",
  vi:"Rủi ro pháp lý/văn hoá cần con người chịu trách nhiệm; AI có thể bỏ sót ngữ cảnh địa phương hoặc dẫn luật sai.",
  en:"Legal/cultural risk needs human accountability; AI may miss local context or misquote the law."},
 {k:["duyệt bài","duyệt nội dung","phê duyệt","duyệt cuối","final review","kiểm tra lần cuối","rà soát cuối","duyệt trước khi đăng","bản cuối","chốt bản cuối","chốt nội dung"],l:"weak",
  vi:"Đây là bước quyết định cuối cùng, cần con người chịu trách nhiệm và đảm bảo phù hợp thực tế.",
  en:"This is the final call — a human needs to own it and confirm real-world fit."},
 {k:["họp team","họp nhóm","quản lý nhóm","phân công công việc","phân công","chia việc","quản lý nhân sự","giải quyết mâu thuẫn","mâu thuẫn nhóm","góp ý cho thành viên","đánh giá thành viên","feedback cho đồng đội","tuyển thành viên","phỏng vấn ứng viên","tuyển dụng"],l:"weak",
  vi:"Yếu tố con người, cảm xúc và động lực đội nhóm không thể giao cho AI — mọi người cần nghe trực tiếp từ bạn.",
  en:"Human factors, emotion and team motivation can't be delegated to AI — people need to hear from you directly."},
 {k:["xác định mục tiêu","đặt mục tiêu","đặt objective","mục tiêu","quyết định why","định hướng chiến lược","ưu tiên việc gì","chọn ưu tiên"],l:"weak",
  vi:"AI tối ưu tốt mục tiêu đã cho, nhưng quyết định mục tiêu nào đáng theo đuổi là phán đoán giá trị của con người.",
  en:"AI is good at optimizing a given goal, but choosing which goal is worth pursuing is a human value judgment."},
 {k:["đạo đức","cân nhắc rủi ro đạo đức","ảnh hưởng xã hội","quyết định nhạy cảm","liêm chính học thuật","đạo văn","plagiarism"],l:"weak",
  vi:"Vấn đề đạo đức và liêm chính đòi hỏi phán đoán giá trị và trách nhiệm mà AI không thể gánh thay.",
  en:"Ethics and integrity calls require value judgment and accountability that AI cannot take on."},
 {k:["đồng cảm","an ủi","tư vấn tâm lý","lắng nghe cảm xúc","empathy","động viên","xin lỗi","nói chuyện với bạn bè","nói chuyện với gia đình","tâm sự","chia tay","lời chúc","viết thư tay","thiệp chúc mừng"],l:"weak",
  vi:"AI có thể mô phỏng sự đồng cảm nhưng không thực sự trải qua cảm xúc — người nhận cần lời thật lòng của bạn.",
  en:"AI can simulate empathy but doesn't truly feel it — the recipient needs your genuine words."},
 {k:["trực giác","cảm nhận thị trường","linh cảm","gu thẩm mỹ","cảm nhận cá nhân"],l:"weak",
  vi:"Trực giác và gu hình thành từ kinh nghiệm sống và bối cảnh xã hội mà AI không có.",
  en:"Intuition and taste are shaped by lived experience and social context that AI doesn't have."},
 {k:["đọc ngữ cảnh văn hoá","đọc ngữ cảnh văn hóa","hiểu ẩn ý","hiểu ngữ cảnh xã hội","văn hoá địa phương","văn hóa địa phương"],l:"weak",
  vi:"Hiểu ẩn ý/văn hoá địa phương sâu cần trải nghiệm sống thực tế, không chỉ phân tích ngôn ngữ.",
  en:"Reading local cultural subtext needs real lived experience, not just language analysis."},
 {k:["xây dựng mối quan hệ","xây dựng lòng tin","networking","chăm sóc mối quan hệ","kết nối mentor","tìm mentor","xin thư giới thiệu","thư giới thiệu"],l:"weak",
  vi:"Quan hệ và lòng tin được xây từ thời gian và sự gắn bó thực sự giữa người với người.",
  en:"Relationships and trust are built through real time and commitment between people."},
 {k:["chịu trách nhiệm","ký quyết định","ký hợp đồng","chịu trách nhiệm pháp lý","chịu hậu quả","ra quyết định","quyết định cuối cùng","quyết định"],l:"weak",
  vi:"AI không thể chịu trách nhiệm pháp lý/đạo đức cho một quyết định — con người phải là người ký và chịu hậu quả.",
  en:"AI can't bear legal or moral responsibility for a decision — a human has to own it."},
 {k:["ý tưởng đột phá","phá vỡ quy tắc","đặt lại câu hỏi","đổi mới mô hình","sáng tạo ý nghĩa","điểm mới của đề tài","tính mới","đóng góp mới","novelty"],l:"weak",
  vi:"AI tối ưu trên pattern có sẵn; đặt lại câu hỏi và tạo ra điểm mới thực sự là năng lực của con người.",
  en:"AI optimizes within existing patterns; questioning the system and creating real novelty is a human capability."},
 {k:["quyết định trong bất định","chấp nhận ambiguity","quyết định mơ hồ","chưa rõ đáp án"],l:"weak",
  vi:"Nhiều quyết định không có đáp án rõ ràng — cần con người cân nhắc đánh đổi và sống với sự không chắc chắn.",
  en:"Many decisions have no clean answer — a human needs to weigh trade-offs and live with uncertainty."},
 {k:["đọc người","đọc đối tác","body language","lãnh đạo đội nhóm","leadership","truyền cảm hứng","dẫn dắt nhóm","thuyết phục trực tiếp"],l:"weak",
  vi:"Đọc người và truyền cảm hứng cần sự hiện diện và tin cậy thực sự của con người.",
  en:"Reading people and inspiring a team need a human's real presence and trust."},
 {k:["làm bài thi","bài thi","đi thi","thi cuối kỳ","thi giữa kỳ","kiểm tra trên lớp","bài kiểm tra","làm bài kiểm tra","exam","test online","thi online","trắc nghiệm online"],l:"weak",
  vi:"Bài thi đo năng lực của chính bạn — dùng AI trong lúc thi thường vi phạm quy chế và làm mất ý nghĩa đánh giá. Hãy dùng AI để ôn trước, không phải để làm bài.",
  en:"Exams measure your own ability — using AI during one usually breaks the rules and defeats the point. Use AI to study beforehand, not to sit the test."},
 {k:["trình bày trước hội đồng","bảo vệ đề tài","thuyết trình trực tiếp","trả lời phản biện","phỏng vấn xin việc","đi phỏng vấn","phỏng vấn học bổng","trả lời phỏng vấn"],l:"weak",
  vi:"Khoảnh khắc trình bày/phỏng vấn trực tiếp là của bạn — AI chỉ giúp chuẩn bị trước, không thể trả lời thay khi bạn đứng trước người hỏi.",
  en:"A live presentation or interview is yours — AI can help prepare, but can't answer for you in the room."},
 {k:["chấm điểm","đánh giá bài của người khác","chấm bài","peer review","nhận xét bài bạn","đánh giá đồng đẳng"],l:"weak",
  vi:"Chấm điểm và đánh giá người khác cần sự công bằng và trách nhiệm của người chấm — không nên giao cho AI quyết định.",
  en:"Grading and evaluating others needs the grader's fairness and accountability — don't let AI decide."},
 {k:["mật khẩu","password","thông tin cá nhân","dữ liệu cá nhân","số tài khoản","cccd","căn cước","hộ chiếu","thông tin khách hàng","dữ liệu khách hàng","dữ liệu nội bộ","tài liệu mật","bảo mật"],l:"weak",
  vi:"Dữ liệu cá nhân/bảo mật không nên dán vào công cụ AI công cộng — có rủi ro lộ thông tin. Hãy tự xử lý hoặc ẩn danh trước khi dùng AI.",
  en:"Personal or confidential data shouldn't go into public AI tools — it risks leaking. Handle it yourself or anonymize it first."},

 /* ---------- WELL: đời sống hằng ngày ---------- */
 {k:["nấu ăn","công thức nấu ăn","món ăn","thực đơn tuần","đi chợ","danh sách đi chợ","mua sắm","gợi ý quà","ý tưởng quà","du lịch","lịch trình du lịch","đặt vé","tìm chỗ ở","dọn nhà","sắp xếp phòng","mẹo vặt","cách làm","hướng dẫn cách","how to","tips","sửa đồ","chăm cây","nuôi thú cưng","cách dùng"],l:"well",
  vi:"Với việc đời sống thường ngày, AI gợi ý nhanh công thức, danh sách, mẹo và các bước làm. Bạn quyết định theo sở thích, ngân sách và tình hình thực tế.",
  en:"For everyday tasks, AI quickly suggests recipes, lists, tips and steps. You decide based on your taste, budget and real situation."},
];

/* Tín hiệu ngữ cảnh: dịch mức một bậc (well → moderate → weak hoặc ngược lại) và thêm ghi chú vào lý do */
const CUES=[
 {k:["nộp","bản nộp","để nộp","nộp cho giảng viên","nộp thầy","nộp cô","submit","được chấm điểm","tính điểm","lấy điểm","bài chấm điểm"],d:+1,
  vi:"Lưu ý: đây là sản phẩm để nộp/chấm điểm — AI chỉ hỗ trợ, nội dung cốt lõi phải do bạn làm và kiểm tra.",
  en:"Note: this will be submitted/graded — AI may assist, but the core work must be yours and checked by you."},
 {k:["gửi khách hàng","gửi đối tác","gửi sếp","gửi giảng viên","đăng công khai","đăng lên fanpage","đăng chính thức","công bố","gửi ban giám khảo","gửi hội đồng"],d:+1,
  vi:"Lưu ý: sản phẩm sẽ đến tay người khác dưới tên bạn — bạn phải đọc kỹ và chịu trách nhiệm trước khi gửi.",
  en:"Note: this goes out under your name — read it carefully and own it before sending."},
 {k:["thông tin cá nhân","dữ liệu cá nhân","dữ liệu khách hàng","thông tin khách hàng","nội bộ công ty","tài liệu nội bộ","bảo mật"],d:+1,
  vi:"Lưu ý: có dữ liệu nhạy cảm — ẩn danh trước khi đưa vào AI.",
  en:"Note: sensitive data involved — anonymize it before giving it to AI."},
 {k:["nháp","bản nháp","draft","tham khảo","gợi ý","ví dụ mẫu","bản mẫu","template","thử nghiệm","sơ bộ","phác thảo"],d:-1,
  vi:"Vì đây chỉ là bản nháp/tham khảo nên có thể dựa vào AI nhiều hơn — miễn là bạn tự hoàn thiện bản chính.",
  en:"Since this is only a draft/reference, you can lean on AI more — as long as you finish the final version yourself."},
];

/* Fallback: ước lượng theo động từ hành động khi không khớp nhóm nào */
const VERB_HINTS=[
 {l:"well",k:["tìm","liệt kê","tổng hợp","sắp xếp","phân loại","định dạng","chuyển","đổi","tra","gợi ý","giải thích","so sánh","tóm","ôn","học","tạo danh sách","lập bảng","đếm","tính","list","find","summarize","compare","convert","organize"],
  vi:"Ước lượng theo loại việc (tìm/tổng hợp/sắp xếp/giải thích): đây thường là thế mạnh của AI. Hãy kiểm tra lại kết quả với nguồn tin cậy.",
  en:"Estimated from the type of action (find/compile/organize/explain): usually an AI strength. Verify results against reliable sources."},
 {l:"weak",k:["chốt","duyệt","ký","gặp","gọi","thuyết phục","phỏng vấn","đánh giá người","động viên","an ủi","lãnh đạo","decide","approve","sign","meet","call","persuade"],
  vi:"Ước lượng theo loại việc (quyết định/chốt/gặp gỡ/thuyết phục): việc này cần con người trực tiếp làm và chịu trách nhiệm.",
  en:"Estimated from the type of action (decide/approve/meet/persuade): this needs a human to do it and own it."},
 {l:"moderate",k:["viết","soạn","làm","chọn","thiết kế","lập","xây dựng","chuẩn bị","phân tích","đánh giá","phát triển","tạo","hoàn thiện","write","draft","make","design","build","prepare","analyse","analyze","create","plan"],
  vi:"Ước lượng theo loại việc (viết/làm/phân tích/xây dựng): AI giúp được phần khung và bản nháp, phần nội dung cốt lõi nên do bạn quyết định.",
  en:"Estimated from the type of action (write/make/analyse/build): AI can help with structure and drafts; the core content should be your call."},
];
const GENERIC={vi:"Chưa có nhóm quy tắc khớp chính xác, nên app ước lượng ở mức Trung bình: dùng AI cho phần khung/nháp, tự làm phần cần hiểu biết riêng và tự kiểm tra kết quả. Thử mô tả việc cụ thể hơn (ví dụ: “tóm tắt 3 bài báo”, “thiết kế poster”, “đàm phán với nhà tài trợ”) để có đánh giá chính xác hơn.",
  en:"No rule group matched exactly, so the app estimates Moderate: use AI for structure and drafts, do the parts that need your own knowledge, and check the result. Describe the task more specifically (e.g. “summarize 3 papers”, “design a poster”, “negotiate with a sponsor”) for a sharper rating."};

/* ============================== Mở rộng dữ liệu (v3)
   k = từ khoá thêm; v × o = cặp "hành động × đối tượng": khớp khi câu có ít nhất một hành động VÀ một đối tượng của cùng nhóm,
   ở bất kỳ vị trí nào (ví dụ "làm giúp mình 10 slide" khớp làm × slide). Điểm của cặp = số chữ của hành động + đối tượng. */
const DOCS=["bài báo","tài liệu","paper","sách","chương","giáo trình","bài giảng","slide","báo cáo","văn bản","bài viết","article","luận văn","khoá luận","video","podcast","cuộc họp","buổi họp","buổi học","bài đọc","nghiên cứu","case","email","hợp đồng","phim","ebook","pdf","transcript"];
const EXT={
 1:{k:["google","tra google","tìm trên mạng","search google","desk research","secondary research","dữ liệu thứ cấp","thông tin cơ bản","kiến thức nền","background research","tìm đáp án nhanh","tìm hiểu nhanh","tìm thông tin nhanh","fact","hỏi chatgpt","tìm mẫu","tìm template","tìm học bổng","tìm khoá học","tìm địa điểm","tìm quán","tìm trend","tìm xu hướng","tìm tin tức","cập nhật tin tức","tin tức","look up"],
    v:["tìm","tìm kiếm","tra","tra cứu","kiếm","săn","lục","search","find","look up","thu thập","tìm hiểu","tổng hợp","gom"],
    o:["tài liệu","nguồn","ref","reference","thông tin","số liệu","dữ liệu thứ cấp","bài báo","paper","nghiên cứu","case study","ví dụ","mẫu","template","báo cáo ngành","thống kê","xu hướng","trend","tin tức","giá","học bổng","khoá học","khóa học","định nghĩa","quy định","địa điểm","sources","articles","data"]},
 2:{k:["key takeaways","ý chính","nội dung chính","tldr","tl;dr","đọc hiểu nhanh","trích ý","rút ý","bullet point","gạch đầu dòng","note taking","ghi chép","tóm gọn","tổng kết nội dung","recap","nghe lại bài giảng","tóm tắt video","tóm tắt sách","tóm tắt chương"],
    v:["tóm tắt","tóm lược","rút gọn","tóm","tổng kết","ghi chú","note","summarize","highlight","đọc nhanh","lướt","recap","ghi chép"],o:DOCS},
 3:{k:["học lý thuyết","tự học","self study","hỏi đáp kiến thức","gia sư ai","tutor","eli5","giải thích đơn giản","phân biệt khái niệm","so sánh khái niệm","hiểu bài","không hiểu bài","học chương mới","học kiến thức mới","ví dụ minh hoạ cho khái niệm","cho ví dụ","lấy ví dụ"],
    v:["giải thích","hiểu","giảng","làm rõ","phân biệt","explain","clarify","học về","tìm hiểu về","cho ví dụ về"],
    o:["khái niệm","lý thuyết","thuật ngữ","công thức","định lý","mô hình","hiện tượng","cơ chế","thuật toán","quy trình","biểu đồ","đề bài","kiến thức","bài học","concept","theory","nguyên lý","học thuyết","định luật"]},
 4:{k:["ôn bài","ôn kiến thức","học bài","học thuộc","ghi nhớ","spaced repetition","anki","quizlet","đề cương","làm đề cương","ôn chương","câu hỏi trắc nghiệm","mock test","đề thi thử","thi thử","luyện đề","kiểm tra kiến thức","tự kiểm tra","practice test","câu hỏi tự luận mẫu"],
    v:["tạo","soạn","làm","generate","lập","viết"],
    o:["flashcard","câu hỏi ôn","câu hỏi ôn tập","quiz","đề cương ôn tập","đề luyện","bài tập luyện","trắc nghiệm","thẻ ghi nhớ","đề thi thử","mock test"]},
 5:{k:["seo","bài seo","blog","bài blog","newsletter","content facebook","content tiktok","content instagram","content linkedin","bio","tagline","tin tuyển dụng","job description","jd","lời giới thiệu","mô tả sự kiện","bài pr","press release","thông cáo báo chí","viết lách","status","thread","cta","call to action","content marketing","content sáng tạo","bài quảng cáo","mô tả khoá học","mô tả dự án","viết giới thiệu","landing copy","nội dung website"],
    v:["viết","soạn","lên","tạo","nghĩ","draft","write","sáng tạo"],
    o:["caption","content","post","bài đăng","status","tiêu đề","slogan","tagline","hashtag","headline","mô tả","quảng cáo","ads","bài pr","bài seo","blog","newsletter","mô tả sản phẩm","cta","lời giới thiệu","bio","tin tuyển dụng","jd","bài fanpage","bài facebook","bài instagram","bài tiktok","bài linkedin","thread","thông cáo"]},
 6:{k:["chuyển ngữ","phiên dịch văn bản","dịch abstract","dịch thuật ngữ","english version","bản tiếng anh","bản tiếng việt","song ngữ","bilingual","sang tiếng anh","sang tiếng việt","to english","to vietnamese"],
    v:["dịch","chuyển ngữ","translate","chuyển sang"],
    o:["tiếng anh","tiếng việt","tiếng trung","tiếng nhật","tiếng hàn","tiếng pháp","tiếng đức","english","tài liệu","bài báo","email","caption","slide","phụ đề","abstract","văn bản","đoạn văn","câu"]},
 7:{k:["check grammar","grammarly","quillbot","sửa văn","biên tập","edit bài","chỉnh sửa câu chữ","trau chuốt","chau chuốt","viết lại cho hay","viết lại cho mượt","rút gọn câu","viết ngắn lại","viết gọn lại","sửa lỗi đánh máy","typo","lỗi đánh máy","đọc soát","làm văn hay hơn","tăng tính học thuật","academic tone","văn phong học thuật","cải thiện câu văn","polish"],
    v:["sửa","chỉnh","rà","soát","kiểm tra","edit","polish","biên tập","trau chuốt","chau chuốt","proofread","cải thiện","viết lại"],
    o:["chính tả","ngữ pháp","câu","câu văn","văn","văn phong","lỗi chính tả","đoạn văn","câu chữ","từ ngữ","grammar","typo","giọng văn","wording"]},
 8:{k:["trình bày văn bản","trình bày word","format word","căn chỉnh","đánh số trang","mục lục tự động","định dạng bảng","chuyển pdf","pdf sang word","word sang pdf","latex","markdown","endnote","zotero","mendeley","trích dẫn","in text citation","chicago","mla","ieee","vancouver","chuẩn trình bày","quy cách trình bày","font times new roman","giãn dòng"],
    v:["định dạng","format","trình bày","chuẩn hoá","chuẩn hóa","chuyển","convert","căn chỉnh","đánh"],
    o:["trích dẫn","tài liệu tham khảo","citation","reference","references","bảng","file","pdf","word","docx","latex","văn bản","số trang","mục lục"]},
 9:{k:["cấu trúc báo cáo","cấu trúc slide","cấu trúc tiểu luận","cấu trúc bài thuyết trình","chia mục","chia phần","sắp xếp ý","sắp xếp luận điểm","mind map","khung sườn","flow bài","luồng bài","dàn bài"],
    v:["lên","lập","xây dựng","làm","tạo","viết","sắp xếp","phác"],
    o:["dàn ý","outline","khung","sườn","bố cục","cấu trúc","mục lục","đề cương chi tiết","framework","dàn bài","luồng"]},
 10:{k:["email xác nhận","đơn xin phép","đơn xin nghỉ học","viết đơn","thư mời","lời mời tham dự","thông báo lớp","tin nhắn nhóm","email đăng ký","email hỏi thông tin","email reminder","reminder","email nhắc deadline","tin nhắn nhắc","thông báo họp","email xin tài liệu","email xin lịch","đặt lịch hẹn"],
    v:["viết","soạn","gửi","trả lời","nhắn"],
    o:["email xin","email hỏi","email nhắc","email cảm ơn","thư cảm ơn","thông báo","lời mời","thư mời","tin nhắn nhóm","thông báo lớp","email xác nhận","email đăng ký","đơn xin","đơn","reminder"]},
 11:{k:["ý tưởng","nghĩ ý tưởng","gợi ý chủ đề","concept","góc nhìn","hướng tiếp cận","ý tưởng sáng tạo","ý tưởng nội dung","ý tưởng quà tặng","ý tưởng sự kiện","ý tưởng video","ý tưởng bài đăng","tên thương hiệu","tên sản phẩm","tên nhóm","tên dự án","đặt tên team","big idea","ideation","nảy ý tưởng","gợi ý hướng"],
    v:["nghĩ","tìm","gợi ý","lên","brainstorm","đề xuất","nảy"],
    o:["ý tưởng","tên","concept","chủ đề","góc nhìn","hướng","idea","ideas"]},
 12:{k:["so sánh giá","review sản phẩm","nên mua","chọn laptop","đánh giá sản phẩm","nên dùng cái nào","cái nào tốt hơn","which is better","bảng ưu nhược","đối chiếu phương án"],
    v:["so sánh","đối chiếu","compare","cân nhắc giữa"],
    o:["lựa chọn","phương án","sản phẩm","công cụ","phần mềm","laptop","điện thoại","gói","dịch vụ","ưu nhược điểm","giá","option","options","app"]},
 13:{k:["vlookup","xlookup","hàm if","sumif","countif","conditional formatting","dashboard","power bi","tableau","looker studio","trực quan hoá","trực quan hóa","visualize","vẽ đồ thị","đồ thị","bảng tổng hợp","tổng hợp số liệu","tính trung bình","tính phần trăm","tính lãi","tính chi phí","tính gpa","số liệu khảo sát","xử lý khảo sát","mã hoá dữ liệu","nhập liệu khảo sát","xuất dữ liệu","bảng excel","file excel","spreadsheet","số liệu","dữ liệu"],
    v:["phân tích","xử lý","tổng hợp","tính","vẽ","làm sạch","lọc","sắp xếp","thống kê","trực quan hoá","trực quan hóa","nhập","mã hoá"],
    o:["số liệu","dữ liệu","data","bảng tính","excel","biểu đồ","chart","khảo sát","doanh số","doanh thu","kết quả khảo sát","bảng điểm","đồ thị","bảng"]},
 14:{k:["kinh tế lượng","econometrics","ols","logit","probit","panel data","dữ liệu bảng","vif","đa cộng tuyến","phương sai thay đổi","tự tương quan","p value","ý nghĩa thống kê","hệ số hồi quy","r bình phương","smartpls","amos","pls sem","ardl","nardl","garch","arima","chuỗi thời gian","time series","mô hình hồi quy","do file","lệnh stata"],
    v:["chạy","kiểm định","ước lượng","đọc","viết lệnh","diễn giải"],
    o:["hồi quy","mô hình","stata","spss","eviews","amos","smartpls","output","kết quả hồi quy","kiểm định","biến"]},
 15:{k:["phân tích bình luận","phân loại bình luận","phân tích feedback","tổng hợp feedback","tổng hợp phản hồi","phân loại khảo sát mở","câu trả lời mở","social listening","lắng nghe mạng xã hội","quét bình luận","scrape","web scraping","cào dữ liệu","crawl dữ liệu","hàng nghìn","hàng trăm","nhiều file","hàng loạt tài liệu"],
    v:["phân loại","tổng hợp","quét","lọc","gắn nhãn","label","cluster","đọc hết"],
    o:["bình luận","comment","comments","review","reviews","phản hồi","feedback","câu trả lời mở","đánh giá khách hàng","tin nhắn"]},
 16:{k:["java","c++","c#","php","react","vue","nodejs","django","flask","api","website","web app","landing page","chatbot","extension","excel macro","macro","vba","google apps script","apps script","jupyter","pandas","matplotlib","github","git","deploy","database","cơ sở dữ liệu","thuật toán","algorithm","pseudo code","lập trình web","front end","back end","frontend","backend","tạo app","làm app","viết app","automation script"],
    v:["viết","lập trình","code","tạo","xây dựng","build","làm","dựng","phát triển"],
    o:["code","web","website","trang web","hàm","script","chatbot","bot","api","app","ứng dụng","phần mềm","game","extension","database","query","landing page","tool","công cụ tự động"]},
 17:{k:["không chạy","bị lỗi","lỗi khi chạy","traceback","stack trace","syntax error","crash","đọc lỗi","tối ưu tốc độ","review code","code review","viết lại code","lỗi cài đặt","cài đặt thư viện","install"],
    v:["sửa","fix","debug","khắc phục","xử lý","tìm lỗi"],
    o:["bug","lỗi code","error","exception","lỗi chạy","lỗi cài đặt","lỗi phần mềm","traceback","crash","code"]},
 18:{k:["dự đoán","predict","prediction","ước tính","estimate","xu hướng thị trường","dự báo xu hướng","forecasting"]},
 19:{k:["gợi ý cá nhân","tuỳ biến","tùy biến","customize","mail merge","email hàng loạt","gửi email hàng loạt"]},
 20:{k:["thủ công","làm thủ công","lặp đi lặp lại","hàng loạt","batch","điền form","điền thông tin","nhập liệu","copy paste","copy dán","gộp file","tách file","merge file","rename","đổi tên file","sắp xếp thư mục","dọn file","phân loại file","phân loại tài liệu","trích xuất thông tin","bóc tách","đối soát","zapier","make com","ifttt","quy trình tự động","workflow tự động","tự động gửi"]},
 21:{k:["kế hoạch học tập","study plan","lịch ôn","lịch ôn thi","thời khoá biểu","thời khóa biểu","quản lý thời gian","pomodoro","lịch tuần","weekly plan","daily plan","sắp xếp công việc","ưu tiên công việc trong ngày","nhắc lịch","calendar","notion","lịch trình","itinerary","lịch trình du lịch","kế hoạch du lịch","danh sách mua sắm","shopping list","packing list","kế hoạch ngày","kế hoạch tuần"],
    v:["lên","lập","xếp","sắp xếp","tạo","làm","lên kế hoạch"],
    o:["lịch","thời khoá biểu","thời gian biểu","checklist","to do list","danh sách việc","lịch trình","lịch học","lịch ôn","itinerary","schedule","kế hoạch học"]},
 22:{k:["ảnh ai","tạo ảnh","vẽ ảnh","midjourney","dall e","stable diffusion","firefly","chỉnh ảnh","sửa ảnh","retouch","làm nét ảnh","upscale","tăng chất lượng ảnh","xoá vật thể","ghép ảnh","ảnh sản phẩm","ảnh nền","avatar","sticker","icon","giọng đọc","voice over","voiceover","đọc văn bản","ghi âm thành văn bản","gỡ băng phỏng vấn","transcript","phiên âm","caption video","nhạc nền ai"],
    v:["tạo","vẽ","generate","chỉnh","sửa","xoá","xóa","tách","làm"],
    o:["ảnh","hình","hình ảnh","illustration","minh hoạ","minh họa","phụ đề","subtitle","transcript","giọng đọc","avatar","icon","sticker","nền","background"]},
 23:{k:["luận văn","khoá luận","khóa luận","đồ án","thesis","dissertation","bài báo khoa học","viết bài báo","journal","abstract","viết abstract","tóm tắt nghiên cứu","phần mở đầu","đặt vấn đề","cơ sở lý thuyết","kết luận","phần thảo luận","discussion","kiến nghị","đề xuất giải pháp","giải pháp","bài phân tích","bài thu hoạch","bài tập cá nhân","bài dự thi","dự thi","eureka","bài nckh","đề tài nghiên cứu","phân tích kết quả"],
    v:["viết","làm","soạn","hoàn thiện","triển khai","phát triển","sửa"],
    o:["tiểu luận","essay","báo cáo","luận văn","khoá luận","khóa luận","đồ án","assignment","bài nghiên cứu","paper","phần mở đầu","cơ sở lý thuyết","kết luận","thảo luận","kiến nghị","giải pháp","bài thu hoạch","abstract","chương","bài dự thi","đề tài"]},
 24:{k:["đọc tài liệu","đọc nghiên cứu","tổng quan","systematic review","meta analysis","nghiên cứu trước","các nghiên cứu trước","nghiên cứu liên quan","related work","xác định khoảng trống","gap","lược khảo","lược khảo tài liệu"],
    v:["đọc","review","hệ thống hoá","hệ thống hóa","lược khảo"],
    o:["nghiên cứu trước","paper","bài báo khoa học","tài liệu nghiên cứu","literature","nghiên cứu liên quan"]},
 25:{k:["google form","form khảo sát","survey","phiếu khảo sát","biến quan sát","mã hoá thang đo","likert","thang likert","mẫu nghiên cứu","chọn mẫu","cỡ mẫu","sampling","khung lý thuyết","biến độc lập","biến phụ thuộc","khảo sát thử","phát khảo sát","gửi khảo sát","pilot test"],
    v:["thiết kế","xây dựng","soạn","viết","làm","lên","chỉnh"],
    o:["bảng hỏi","khảo sát","survey","phiếu khảo sát","câu hỏi khảo sát","thang đo","câu hỏi phỏng vấn","mô hình nghiên cứu","giả thuyết","khung lý thuyết","biến quan sát"]},
 26:{k:["bài tập","exercise","giải bài","làm bài tập về nhà","toán cao cấp","xác suất thống kê","vi tích phân","đại số tuyến tính","kinh tế vi mô","kinh tế vĩ mô","bài tập tài chính","định khoản","bài toán","check đáp án","kiểm tra đáp án","chữa bài"],
    v:["giải","làm","chữa","check","kiểm tra","đối chiếu"],
    o:["bài tập","bài toán","đề bài","đề toán","phương trình","homework","bài tập về nhà","đáp án","câu hỏi bài tập"]},
 27:{k:["trình chiếu","google slides","keynote","bài present","present","thiết kế slide","làm ppt","ppt","slide deck","slides"],
    v:["làm","thiết kế","soạn","tạo","dựng","chỉnh","lên"],
    o:["slide","slides","ppt","powerpoint","deck","bài thuyết trình","bài present","trình chiếu"]},
 28:{k:["luyện nói trước","tập nói","lời dẫn","kịch bản mc","dẫn chương trình","bài phát biểu","speech","phát biểu","câu hỏi phản biện","tập dượt","rehearsal","chuẩn bị phỏng vấn","luyện phỏng vấn","mock interview","phỏng vấn thử"],
    v:["viết","soạn","chuẩn bị","luyện","tập","dự đoán","dượt"],
    o:["kịch bản thuyết trình","lời thoại","bài nói","bài phát biểu","speech","q&a","câu hỏi phản biện","lời dẫn","phỏng vấn","buổi phỏng vấn","thuyết trình","bảo vệ","bài thuyết trình"]},
 29:{k:["portfolio","hồ sơ năng lực","profile cá nhân","giới thiệu bản thân","self introduction","thư ứng tuyển","đơn ứng tuyển","ứng tuyển","application","essay xin học bổng","bài luận du học","hồ sơ du học","apply","apply học bổng","apply thực tập"],
    v:["viết","làm","sửa","chỉnh","tối ưu","soạn"],
    o:["cv","resume","cover letter","portfolio","hồ sơ","bài luận học bổng","personal statement","linkedin","thư xin việc","thư ứng tuyển"]},
 30:{k:["figma","brochure","tờ rơi","flyer","standee","backdrop","bao bì","packaging","menu","name card","danh thiếp","lookbook","catalogue","catalog","template thiết kế","màu sắc thương hiệu","bảng màu","font chữ","typography","layout","bố cục trang","wireframe","prototype","giao diện app","giao diện web","moodboard","thiệp","thiệp mời","certificate","giấy chứng nhận"],
    v:["thiết kế","làm","vẽ","dựng","tạo"],
    o:["poster","banner","logo","brochure","tờ rơi","flyer","standee","backdrop","bao bì","menu","name card","infographic","thumbnail","giao diện","wireframe","mockup","key visual","bộ nhận diện","thiệp","moodboard"]},
 31:{k:["capcut","premiere","vlog","short video","youtube","livestream","kịch bản livestream","quay phim","dựng phim","montage","lồng nhạc","chèn nhạc","hiệu ứng video","motion","animation","hoạt hình","mv","phim ngắn","clip","shot list","trailer"],
    v:["làm","quay","dựng","edit","cắt","viết","lên","sản xuất"],
    o:["video","clip","vlog","tiktok","reels","podcast","phim","phim ngắn","mv","kịch bản video","storyboard","livestream","teaser","trailer"]},
 32:{k:["viết tiểu thuyết","tiểu thuyết","fanfic","viết nhật ký","nhật ký","văn mẫu","bài văn","tập làm văn","viết văn","nghị luận văn học","cảm nhận tác phẩm","phân tích tác phẩm","thơ","truyện","lời bài hát","viết rap","rap","kịch bản phim","kịch ngắn"],
    v:["viết","sáng tác","làm"],
    o:["thơ","truyện","văn","tiểu thuyết","lời bài hát","nhạc","rap","kịch","bài văn"]},
 33:{k:["phân tích hành vi","hành vi khách hàng","hành vi người tiêu dùng","consumer behavior","customer journey","hành trình khách hàng","nghiên cứu người dùng","user research","pain point","nỗi đau khách hàng","usp","value proposition","tuyên bố giá trị","phân khúc","segmentation","thị trường mục tiêu","target market","bcg","porter","5 forces","năm áp lực","chuỗi giá trị","value chain","phân tích ngành","quy mô thị trường","market size","tone of voice","big idea","key message","content pillar","gia nhập thị trường","market entry","thâm nhập thị trường","mở rộng thị trường","src","self reference criterion"],
    v:["phân tích","nghiên cứu","xác định","xây dựng","tìm","lập","đánh giá"],
    o:["insight","target audience","khách hàng mục tiêu","đối thủ","thị trường","persona","chân dung khách hàng","hành vi khách hàng","swot","pestel","customer journey","content pillar","chiến lược nội dung","phân khúc","ngành"]},
 34:{k:["kế hoạch tiếp thị","chiến lược marketing","marketing strategy","digital marketing","chạy quảng cáo","chạy ads","facebook ads","google ads","tiktok ads","booking kol","kol","koc","influencer","seeding","activation","sampling sản phẩm","minigame","giveaway","khuyến mãi","promotion","ra mắt sản phẩm","workshop","hội thảo","talkshow","cuộc thi","gala","run of show","kịch bản chương trình","timeline sự kiện","ngân sách sự kiện","proposal","đề xuất dự án","đề án"],
    v:["lên","lập","xây dựng","làm","viết","soạn","tổ chức"],
    o:["kế hoạch marketing","kế hoạch truyền thông","chiến dịch","campaign","sự kiện","event","workshop","minigame","proposal","media plan","talkshow","cuộc thi"]},
 35:{k:["tin nhắn chốt đơn","chốt đơn","tư vấn khách","tư vấn khách hàng","trả lời tin nhắn","inbox","reply comment","phản hồi đánh giá","xin lỗi khách","hoàn tiền","đổi trả","faq","câu hỏi thường gặp","kịch bản tư vấn","kịch bản chat","email đối tác","email sếp","email công việc","email chuyên nghiệp","email gửi thầy","email gửi cô","email xin gia hạn","xin gia hạn","email giáo viên","email nhà tuyển dụng","email hr"],
    v:["viết","soạn","trả lời","phản hồi","gửi","nhắn"],
    o:["khách hàng","đối tác","khiếu nại","giảng viên","thầy cô","sếp","quản lý","nhà tuyển dụng","hr","inbox","bình luận khách"]},
 36:{k:["wbs","phân rã công việc","chia nhỏ công việc","chia nhỏ task","milestone","mốc thời gian","tiến độ","theo dõi tiến độ","báo cáo tiến độ","trello","jira","asana","kanban","scrum","agile","sprint","quản lý công việc","kế hoạch nhóm","kế hoạch triển khai","action plan"],
    v:["lập","lên","xây dựng","theo dõi","quản lý","chia nhỏ"],
    o:["kế hoạch","tiến độ","timeline","dự án","milestone","wbs","action plan","deadline","rủi ro"]},
 37:{k:["lập ngân sách","ngân sách cá nhân","chi tiêu","quản lý chi tiêu","budget","doanh thu","lợi nhuận","điểm hoà vốn","break even","npv","irr","định giá","giá vốn","p&l","bảng cân đối","kế toán","thuế","startup","khởi nghiệp","gọi vốn","pitching","unit economics","business model canvas","lean canvas"],
    v:["lập","tính","dự toán","xây dựng","phân tích","định giá"],
    o:["ngân sách","chi phí","doanh thu","lợi nhuận","giá","dòng tiền","báo cáo tài chính","kế hoạch kinh doanh","mô hình kinh doanh"]},
 38:{k:["speaking","writing task","task 2","task 1","reading","listening","toefl","hsk","jlpt","topik","vstep","luyện nghe","luyện đọc","luyện ngữ pháp","chữa bài writing","sửa bài writing","conversation","hội thoại","giao tiếp tiếng anh","phát âm"],
    v:["luyện","học","tập","ôn","chữa"],
    o:["speaking","writing","ielts","toeic","toefl","tiếng anh","tiếng trung","tiếng nhật","tiếng hàn","phát âm","hội thoại"]},
 39:{k:["bệnh","thuốc","uống thuốc","khám bệnh","bác sĩ","giảm cân","tăng cơ","gym","lịch tập","thực đơn","calo","giấc ngủ","mất ngủ","tiết kiệm","gửi tiết kiệm","cổ phiếu","bất động sản","khoản vay","bảo hiểm","quyền lợi người lao động","luật lao động","hợp đồng thuê nhà"]},
 40:{k:["chọn môn","đăng ký môn","chọn chuyên ngành","chọn công việc","chọn công ty","chọn nơi thực tập","thực tập ở đâu","định hướng","lộ trình học","roadmap học","học gì","nên học","chọn khoá học","chọn câu lạc bộ","chọn clb","chọn ngành học","chọn học bổng","có nên"],
    v:["chọn","lựa chọn","cân nhắc","định hướng"],
    o:["đề tài","chủ đề nghiên cứu","ngành","nghề","trường","môn","chuyên ngành","công việc","công ty","nơi thực tập","học bổng","khoá học","khóa học"]},
 41:{k:["brand strategy","tầm nhìn","sứ mệnh","brand purpose","brand essence","tính cách thương hiệu","brand personality","kiến trúc thương hiệu","định hướng thương hiệu","chiến lược công ty","chiến lược kinh doanh","chiến lược dài hạn","pivot"]},
 42:{k:["xin sponsor","sponsor","kêu gọi sponsor","pitching trực tiếp","thuyết phục","thuyết phục khách","thương thảo","mặc cả","trả giá","deal","liên hệ đối tác","gặp mặt","gặp trực tiếp","gọi điện","cold call","telesales","chào hàng"]},
 43:{k:["luật","điều luật","nghị định","thông tư","văn bản pháp luật","quy chế","điều lệ","giấy phép","đăng ký kinh doanh","sở hữu trí tuệ","nhãn hiệu","bản quyền hình ảnh","bản quyền nhạc","vi phạm bản quyền","gdpr","privacy policy","chính sách bảo mật","điều khoản sử dụng","biên bản thoả thuận","mou","khiếu nại pháp lý","tranh chấp"]},
 44:{k:["kiểm duyệt nội dung","kiểm tra cuối","check cuối","chốt","chốt bài","chốt slide","approve","sign off","nghiệm thu","quyết định đăng","bấm đăng","đăng bài","publish","xuất bản","gửi bản cuối","nộp bản cuối","quality check","qc","fact check cuối"]},
 45:{k:["teamwork","làm việc nhóm","điều phối nhóm","quản lý thành viên","đôn đốc","nhắc nhở thành viên","động viên nhóm","họp","cuộc họp nhóm","chủ trì họp","biểu quyết","thống nhất ý kiến","giao việc","delegation","tuyển cộng tác viên","onboarding thành viên","one on one"]},
 46:{k:["okr","objective","đặt kpi","mục tiêu cá nhân","mục tiêu dự án","mục tiêu học tập","mục tiêu nghề nghiệp","đặt chỉ tiêu","target","tầm nhìn cá nhân","giá trị sống","ưu tiên","thứ tự ưu tiên"]},
 47:{k:["ethics","ethical","đạo đức ai","ai ethics","trách nhiệm xã hội","csr","thiên kiến","bias","công bằng","phân biệt đối xử","quyền riêng tư","copy bài","làm hộ","viết hộ","nhờ ai làm hộ","gian lận","quay cóp","chép bài"]},
 48:{k:["stress","căng thẳng","áp lực","buồn","cô đơn","tâm trạng","chia buồn","thăm hỏi","an ủi bạn","lời xin lỗi","lời cảm ơn chân thành","thư cho người yêu","tỏ tình","lời tỏ tình","nói chuyện khó","cuộc nói chuyện khó","hoà giải","chúc mừng sinh nhật","sinh nhật","đám cưới","phát biểu đám cưới","thư cho bố mẹ","thư cho gia đình","quan tâm"]},
 49:{k:["chọn màu","chọn font","chọn ảnh","chọn outfit","phối đồ","outfit","thẩm mỹ","vibe","cảm nhận"]},
 50:{k:["văn hoá","văn hóa","phong tục","tập quán","tôn giáo","kiêng kỵ","tiếng lóng","slang","meme","trend gen z","ẩn ý","châm biếm","mỉa mai","bản địa hoá","bản địa hóa","localization","thị hiếu địa phương"]},
 51:{k:["kết bạn","làm quen","giữ liên lạc","xin giới thiệu","referral","alumni","cựu sinh viên","gặp gỡ","kết nối","coffee chat","xin lời khuyên","hỏi kinh nghiệm"]},
 52:{k:["lựa chọn cuối","chọn phương án cuối","chọn người","chọn ứng viên","cam kết","đánh đổi","trade off","ký","ký tên","xác nhận","phê duyệt ngân sách","chi tiền","giải ngân","đầu tư tiền"]},
 53:{k:["sáng tạo","đổi mới","innovation","khác biệt","điểm khác biệt","độc đáo","ý tưởng mới lạ","mô hình mới","giải pháp mới","sáng kiến","phát minh","hướng đi mới","góc nhìn mới","tư duy phản biện","critical thinking","phản biện ý tưởng","đặt câu hỏi nghiên cứu","câu hỏi nghiên cứu","research question"]},
 54:{k:["không chắc","phân vân","lưỡng lự","rủi ro cao","khủng hoảng","xử lý khủng hoảng","crisis","tình huống bất ngờ","ứng biến","xử lý sự cố","sự cố"]},
 55:{k:["trưởng nhóm","leader","làm leader","dẫn dắt","quản lý cảm xúc nhóm","tạo động lực","motivate","truyền lửa","coaching","mentoring","kèm cặp","đào tạo thành viên","huấn luyện","đọc vị","đọc phòng"]},
 56:{k:["thi","kỳ thi","kì thi","giữa kì","cuối kì","thi cuối kì","thi giữa kì","bài kiểm tra 15 phút","quiz trên lớp","kiểm tra miệng","thi vấn đáp","vấn đáp","thi thực hành","take home exam","proctor"]},
 57:{k:["thuyết trình trước lớp","thuyết trình trên lớp","present trước lớp","bảo vệ khoá luận","bảo vệ luận văn","bảo vệ đồ án","hội đồng","trả lời hội đồng","phỏng vấn","interview","phỏng vấn trực tiếp","phỏng vấn online","vòng phỏng vấn","tranh biện","debate","hùng biện","đứng lớp","dạy học","giảng dạy","trợ giảng"]},
 58:{k:["chấm","cho điểm","xếp loại","đánh giá năng lực","xét duyệt hồ sơ","xét tuyển","chấm giải","giám khảo","nhận xét học sinh","nhận xét sinh viên","đánh giá nhân viên","performance review"]},
 59:{k:["tài khoản ngân hàng","số thẻ","thẻ tín dụng","otp","mã otp","api key","private key","hồ sơ bệnh án","bệnh án","lương","bảng lương","thông tin nhân viên","danh sách khách hàng","số điện thoại khách","địa chỉ nhà","dữ liệu nhạy cảm","nda","bí mật kinh doanh","trade secret","đề thi chưa công bố"]},
};
const CUE_EXT=[
 ["nộp bài","deadline nộp","cho giảng viên","cho thầy","cho cô","điểm số","đánh giá cuối kỳ","báo cáo chính thức","bản chính thức","chính thức","in ấn","in ra"],
 ["gửi nhà tài trợ","gửi khách","trình sếp","trình lãnh đạo","cho công ty","khách hàng thật","đăng báo"],
 ["lương","bảng lương","số điện thoại","danh sách khách hàng","hồ sơ nhân viên","bệnh án","nda","bí mật"],
 ["thử","học hỏi","để học","để hiểu","luyện tập","practice","demo","ý tưởng ban đầu","bản đầu tiên","bản thô","thô","brainstorm trước"],
];
const VERB_EXT=[
 ["kiếm","liệt","sắp","lọc","đổi tên","chuyển đổi","dịch","rút gọn","căn chỉnh","đo","ước tính","kiểm tra lỗi","nhắc","ghi","note","copy","gộp","tách","trích","hỏi","luyện","check","tìm hiểu"],
 ["ký","phê duyệt","đàm phán","thương lượng","tuyển","sa thải","an ủi","xin lỗi","tỏ tình","dẫn dắt","chịu","cam kết","quyết định","bảo vệ"],
 ["xây","hoàn thiện","triển khai","lên","nghiên cứu","tổ chức","quản lý","thiết lập","cải thiện","tối ưu","giải quyết","xử lý","trình bày","thực hiện","vẽ","quay","dựng","sáng tác","sửa","chỉnh"],
];
/* hợp nhất vào bộ quy tắc */
(function(){const uniq=a=>[...new Set(a)];
 for(const g in EXT){const r=TAX[g-1], e=EXT[g]; r.k=uniq(r.k.concat(e.k||[])); if(e.v){r.v=uniq(e.v); r.o=uniq(e.o);} }
 CUE_EXT.forEach((a,i)=>CUES[i].k=uniq(CUES[i].k.concat(a)));
 VERB_EXT.forEach((a,i)=>{const map=[0,1,2]; VERB_HINTS[map[i]].k=uniq(VERB_HINTS[map[i]].k.concat(a));});
})();

/* ---------- Bộ khớp: theo ranh giới từ, hỗ trợ gõ không dấu ---------- */
const LV=["well","moderate","weak"];
function stripVN(s){return s.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D");}
function toks(s){return " "+String(s||"").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}&+#]+/gu," ").trim()+" ";}
function prep(text){const a=toks(text), b=stripVN(a); return {a,b,plain:a===b};}
function hit(P,kw){const k=toks(kw).trim(); if(!k) return false; return P.plain? P.b.includes(" "+stripVN(k)+" ") : P.a.includes(" "+k+" ");}
function kwWeight(kw){return toks(kw).trim().split(" ").length;}
function bestHit(P,list){let w=0; for(const kw of list) if(hit(P,kw)){const x=kwWeight(kw); if(x>w) w=x;} return w;}
function ruleScore(P,r){
  let s=0, longest=0;
  for(const kw of r.k) if(hit(P,kw)){ const w=kwWeight(kw); s+=w; if(w>longest) longest=w; }
  if(r.v){ const a=bestHit(P,r.v); if(a){ const b=bestHit(P,r.o); if(b){ s+=a+b; if(a+b>longest) longest=a+b; } } }
  return {s,longest};
}
function bestRule(P){
  let best=-1, bs=0, bl=0;
  for(let i=0;i<TAX.length;i++){ const {s,longest}=ruleScore(P,TAX[i]); if(s===0) continue;
    /* ưu tiên khớp dài nhất (cụ thể nhất), rồi tổng điểm */
    if(longest>bl||(longest===bl&&s>bs)){best=i;bs=s;bl=longest;} }
  return best;
}
function classifySubtask(text,context){
  const P=prep(text);
  if(!P.a.trim()) return {level:"unknown",rule:-1,cues:[],src:"none"};
  let rule=bestRule(P), src="rule";
  if(rule<0&&context){ const PC=prep(context+" "+text); rule=bestRule(PC); if(rule>=0) src="context"; }
  let level, cues=[];
  if(rule>=0){ level=TAX[rule].l;
    const ruleKws=new Set(TAX[rule].k.concat(TAX[rule].v||[],TAX[rule].o||[]).map(k=>toks(k).trim()));
    let shift=0;
    CUES.forEach((c,ci)=>{ if(c.k.some(kw=>hit(P,kw)&&!ruleKws.has(toks(kw).trim()))){
      if(Math.sign(c.d)!==-Math.sign(shift)&&!(c.d<0&&level==="well")){ shift+=c.d; cues.push(ci); } } });
    /* tín hiệu "nộp/gửi" chỉ hạ Cao → Trung bình (kèm ghi chú); tín hiệu "nháp" nâng một bậc */
    if(shift>0&&level==="well") level="moderate"; else if(shift<0) level=LV[Math.max(0,LV.indexOf(level)-1)];
    return {level,rule,cues,src}; }
  for(let v=0;v<VERB_HINTS.length;v++) if(VERB_HINTS[v].k.some(kw=>hit(P,kw))) return {level:VERB_HINTS[v].l,rule:-1,cues:[],src:"verb",verb:v};
  return {level:"moderate",rule:-1,cues:[],src:"generic"};
}
function reasonOf(it){
  const c=classifySubtask(it.subtask,it.overall), L=lang==="vi"?"vi":"en";
  if(c.src==="none") return t("reason_unknown");
  let r = c.rule>=0 ? TAX[c.rule][L] : c.src==="verb" ? VERB_HINTS[c.verb][L] : GENERIC[L];
  if(c.src==="context") r=(L==="vi"?"(Ước lượng theo task tổng) ":"(Estimated from the overall task) ")+r;
  for(const ci of c.cues) r+=" "+CUES[ci][L];
  return r;
}
/* Cập nhật lại mức cho các task đã lưu theo bộ quy tắc mới */
function reclassTasks(d){ if(!d||!d.tasks) return; let ch=false;
  for(const it of d.tasks){ const c=classifySubtask(it.subtask,it.overall); if(it.level!==c.level||it.rule!==c.rule){ it.level=c.level; it.rule=c.rule; ch=true; } }
  return ch; }
