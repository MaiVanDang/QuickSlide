"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import api from "../../lib/api"

export default function Page() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = Object.fromEntries(formData.entries());
    localStorage.setItem("inputData", JSON.stringify(data));
    //Load template, bỏ qua nếu đã có trong localStorage
    if (localStorage.getItem("template") == null) {
      await loadTemplate(String(data.name)); //Hiện load theo name, có thể chỉnh load theo trường khác
    }
    //Load placeHolder, bỏ qua nếu đã có trong localStorage
    if (localStorage.getItem("placeholder") == null) {
      await loadPlaceholder(String(data.title)); //Hiện load theo title, có thể chỉnh load theo trường khác
    }

    //Tạo JSON placeholder rỗng nếu không load được trong db
    if (localStorage.getItem("placeholder") == null) {
      localStorage.setItem("placeholder", JSON.stringify({}));
    }
    //Xử lý chèn dữ liệu vào Placeholder
    insertData();
    // Chuyển hướng
    router.push('/placeholders');
  }
  const loadTemplate = async (name) => {
    try {
      const response = await api.get(`/load/template/${name}`);
      localStorage.setItem("template", response.data);
    } catch (err) {
      if (err.response) {
        if (err.response.status === 404) {
          console.log("Template not found");
        } else {
          alert("Server error at load template: " + err.response.status);
        }
      } else {
        alert("Network error");
      }
    }
  };
  const loadPlaceholder = async (title) => {
    try {
      const response = await api.get(`/load/placeholder/${title}`);
      localStorage.setItem("placeholder", JSON.stringify(response.data, null, 2));
    } catch (err) {
      if (err.response) {
        if (err.response.status === 404) {
          console.log("Place holder not found");
        } else {
          alert("Server error at load placeholder: " + err.response.status);
        }
      } else {
        alert("Network error");
      }
    }
  }
  const insertData = () => {
    const input = JSON.parse(localStorage.getItem("inputData"));
    const placeholders = JSON.parse(localStorage.getItem("placeholder"));
    let i = 1;
    //Nếu không đủ placeholder, tạo placeholder mới
    //Chèn name
    if (input.name) {
      insertToPlaceHolder(placeholders, i, input.name);
      i += 1;
    }
    //Chèn subject
    if (input.subject) {
      insertToPlaceHolder(placeholders, i, input.subject);
      i += 1;
    }
    //Chèn title
    if (input.title) {
      insertToPlaceHolder(placeholders, i, input.title);
      i += 1;
    }
    //Chèn content (mỗi câu 1 placeholder)
    if (input.content) {
      const sentences = input.content.split(/\./);
      for (let sentence in sentences) {
        insertToPlaceHolder(placeholders, i, sentences[sentence]);
        i += 1;
      }
    }
    localStorage.setItem("placeholder", JSON.stringify(placeholders));
  }
  const insertToPlaceHolder = (placeholders, i, data) => {
    if (!placeholders[i]) {
      makeNewPlaceHolder(placeholders, i);
    }
    placeholders[i].data = data;
  }
  const makeNewPlaceHolder = (placeholders, i) => {
    placeholders[i] = {
      x: 0,
      y: 0,
      height: 100,
      width: 200,
      zIndex: 1
    }
  }
  const handleReset = () => {
    router.push('/placeholders');
  }
  return (
    <div className="p-6">
      <div className="min-h-[75px] max-h-fit w-full border-b-4 border-gray-900">
        <div className="absolute  text-center font-bold text-3xl w-[120px] h-[70px]">
          Quick Slide
        </div>
        <h1 className="font-bold text-4xl text-center">
          クイックスライド作成
        </h1>
      </div>
      <form onSubmit={handleSubmit} onReset={handleReset}>
        <div className="min-w-fit max-w-full min-h-[600px] max-h-fit">
          <div className="min-w-fit max-w-full min-h-[60px] max-h-fit flex flex-row justify-center">
            <div className="w-[200px] min-h-[60px] max-h-fit text-2xl flex justify-center items-center">
              科目名
            </div>
            <div className="min-w-[800px] max-w-full min-h-[60px] max-h-fit flex items-center">
              <input
                className="display: block w-full h-[40px] border border-gray-400 rounded-lg shadow-md px-4" name="name"
                placeholder="スライドの内容に対応する件名を入力してください" value={name} onChange={(e) => setName(e.target.value)}></input>
            </div>
          </div>
          <div className="min-w-fit max-w-full min-h-[60px] max-h-fit flex flex-row justify-center">
            <div className="w-[200px] min-h-[60px] max-h-fit text-2xl flex justify-center items-center">
              授業
            </div>
            <div className="min-w-[800px] max-w-full min-h-[60px] max-h-fit flex items-center">
              <input
                className="display: block w-full h-[40px] border border-gray-400 rounded-lg shadow-md px-4" name="subject"
                placeholder="名前またはレッスン数を入力してください" value={subject} onChange={(e) => setSubject(e.target.value)}></input>
            </div>
          </div>
          <div className="min-w-fit max-w-full min-h-[60px] max-h-fit flex flex-row justify-center">
            <div className="w-[200px] min-h-[60px] max-h-fit text-2xl flex justify-center items-center">
              タイトル
            </div>
            <div className="min-w-[800px] max-w-full min-h-[60px] max-h-fit flex items-center">
              <input
                className="display: block w-full h-[40px] border border-gray-400 rounded-lg shadow-md px-4" name="title"
                placeholder="スライドのタイトルを入力してください" value={title} onChange={(e) => setTitle(e.target.value)}></input>
            </div>
          </div>
          <div className="min-w-fit max-w-full min-h-[350px] max-h-fit flex flex-row justify-center">
            <div className="w-[200px] min-h-[60px] max-h-fit text-2xl flex justify-center items-center">
              内容
            </div>
            <div className="min-w-[800px] max-w-full min-h-[350px] max-h-fit flex items-center">
              <textarea
                className="display: block w-full h-[320px] border border-gray-400 rounded-lg shadow-md px-4" name="content"
                placeholder="スライドに表示されるメインコンテンツを入力します" value={content} onChange={(e) => setContent(e.target.value)}></textarea>
            </div>
          </div>
          <div className="min-w-fit max-w-full min-h-[60px] max-h-fit flex flex-row justify-center items-center justify-self-center content-between gap-40">
            <button
              className="w-[150px] h-[50px] bg-blue-500 hover:bg-blue-700 rounded-lg px-4"
              type="submit">作成 </button>
            <button
              className="w-[150px] h-[50px]  border-2 border-red-500 hover:bg-red-500 rounded-lg px-4"
              type="reset">キャンセル</button>
          </div>
        </div>
      </form>
    </div>
  );
}

//Task
//Engine Tự động tạo Slide
//Input Handler: Form nhập liệu \to Lưu tạm thành JSON.
//Parser Engine: Đọc file Template \to Phân tích cấu trúc XML để lấy ID & Tọa độ Placeholder.
//Mapper: Thuật toán khớp dữ liệu từ JSON vào ID trong XML \to Render Slide & Preview. API tạo slide tự động từ dữ liệu nhập.
//Xây dựng thuật toán tự động căn chỉnh nội dung vừa khung placeholder

