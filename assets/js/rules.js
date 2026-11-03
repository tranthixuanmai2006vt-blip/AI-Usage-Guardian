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
 {l:"weak",k:["quyết","chốt","duyệt","ký","gặp","gọi","thuyết phục","phỏng vấn","đánh giá người","động viên","an ủi","lãnh đạo","decide","approve","sign","meet","call","persuade"],
  vi:"Ước lượng theo loại việc (quyết định/chốt/gặp gỡ/thuyết phục): việc này cần con người trực tiếp làm và chịu trách nhiệm.",
  en:"Estimated from the type of action (decide/approve/meet/persuade): this needs a human to do it and own it."},
 {l:"moderate",k:["viết","soạn","làm","chọn","thiết kế","lập","xây dựng","chuẩn bị","phân tích","đánh giá","phát triển","tạo","hoàn thiện","write","draft","make","design","build","prepare","analyse","analyze","create","plan"],
  vi:"Ước lượng theo loại việc (viết/làm/phân tích/xây dựng): AI giúp được phần khung và bản nháp, phần nội dung cốt lõi nên do bạn quyết định.",
  en:"Estimated from the type of action (write/make/analyse/build): AI can help with structure and drafts; the core content should be your call."},
];
const GENERIC={vi:"Chưa có nhóm quy tắc khớp chính xác, nên app ước lượng ở mức Trung bình: dùng AI cho phần khung/nháp, tự làm phần cần hiểu biết riêng và tự kiểm tra kết quả. Thử mô tả việc cụ thể hơn (ví dụ: “tóm tắt 3 bài báo”, “thiết kế poster”, “đàm phán với nhà tài trợ”) để có đánh giá chính xác hơn.",
  en:"No rule group matched exactly, so the app estimates Moderate: use AI for structure and drafts, do the parts that need your own knowledge, and check the result. Describe the task more specifically (e.g. “summarize 3 papers”, “design a poster”, “negotiate with a sponsor”) for a sharper rating."};

/* ---------- Bộ khớp: theo ranh giới từ, hỗ trợ gõ không dấu ---------- */
const LV=["well","moderate","weak"];
function stripVN(s){return s.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D");}
function toks(s){return " "+String(s||"").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}&+#]+/gu," ").trim()+" ";}
function prep(text){const a=toks(text), b=stripVN(a); return {a,b,plain:a===b};}
function hit(P,kw){const k=toks(kw).trim(); if(!k) return false; return P.plain? P.b.includes(" "+stripVN(k)+" ") : P.a.includes(" "+k+" ");}
function kwWeight(kw){return toks(kw).trim().split(" ").length;}
function bestRule(P){
  let best=-1, bs=0, bl=0;
  for(let i=0;i<TAX.length;i++){ let s=0, longest=0;
    for(const kw of TAX[i].k) if(hit(P,kw)){ const w=kwWeight(kw); s+=w; if(w>longest) longest=w; }
    if(s===0) continue;
    /* ưu tiên cụm từ dài nhất (cụ thể nhất), rồi tổng điểm */
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
    const ruleKws=new Set(TAX[rule].k.map(k=>toks(k).trim()));
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
