Tạo file .env.local dựa trên .env.example để dự án hoạt động chính xác

Các rule:
Ví dụ cho việc nhập nội dung ở tạo slide nhanh, excel hoặc docs( công khai) cho việc tạo hàng loạt
Ví dụ 1 bài thuyết trình có 5 trang slide như sau:

Tiêu đề của slide 1 ( mặc định dòng đầu tiên và khi ấn enter xuống dòng sẽ là sang phần nội dung, nếu chưa ấn enter thì nó vẫn là tiêu đề, ví dụ như cả đoạn này)
Link ảnh được gán
\- 
Link ảnh được gán khác ( được chuyển tiếp bằng một dấu \-)
\-
Link ảnh được gán thứ (n)(Link ảnh thứ n sau n lần \-)
\\-- ( 2 dấu gach chéo + 2 dấu gạch ngang này là sử dụng cho việc chuyển sang thuộc tính khác, quy luật sẽ là Link ảnh -> Captions -> Text -> Dates là các ô thuộc tính tiêu biểu)
Captions( Chú thích cho các phần muốn giải thích, đây được coi là một thuộc tính riêng có trong templates để sắp xếp tùy ý)
\-
Caption thứ(n) (Sau n lần nhập \-)
\\--
Text( Đây là nội dung muốn trình bày, ô thuộc tính text)
\-
Text thứ (n) (Sau n lần nhập \-)
\\--
Dates(Đây là một thuộc tính riêng cho việc ghi thời gian có thể điền thời gian hoặc có thể bỏ qua thời gian nó sẽ tự updates ngày mới nhất, nhưng với những thời gian nào ghi chú cho lịch sử thì nên điền nhé)
\-
Dates thứ (n) ( Sau n lần nhập \-)
Như vậy là hoàn thành slide 1, để chuyển qua slide thứ 2 nhập ---(3 dấu gạch ngang). Sau 3 dấu gạch ngang này sẽ được chuyển qua slide thứ 2, và việc nhập nội dung quy luật nhập giống slide đầu tiên. Cứ nhập tương tự với các slide.
Chú ý với slide chỉ có tiêu đề và nội dung chỉ cần nhập như sau:
Title ( dòng đầu là tiêu đề và nhấn enter để xuống dòng cho nội dung)
Text( Dòng tiếp theo là nội dung bỏ qua tất cả các rule khác)
--- (3 dấu gạch ngang để chuyển slide tiếp theo)
Title
Text
Như vậy nhé, vậy các slide có thêm thuộc tính khác thì nhập đầy đủ các \\-- và \-.
Một note chú ý khác ví dụ templates có 2 link ảnh nhưng bạn chỉ chèn 1 link ảnh thì chỉ cần nhập, hoặc thuộc tính nào không nhập thì chỉ cần các dấu \\-- và \- còn nội dung bên trong không cần nhập. Ví dụ
Title
Link ảnh 1
\-
\\--
\\--
\\--
--- (hết trang slide đó, phần nào có thì mới nhập nội dung)

Về đăng ký đăng nhập, username, password cần tối thiểu 6 ký tự, nhận mail @gmail.com
Đăng nhập bằng username hoặc gmail đều được + password

