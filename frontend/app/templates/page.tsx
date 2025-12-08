"use client";

import { useState, useMemo } from "react";
import { Search, Filter, Grid, List, Clock, Tag, ChevronDown } from "lucide-react";

// Mock data - thay thế bằng API call thực tế
// các ảnh đang chưa tìm được ảnh phù hợp 
const mockTemplates = [
  {
    id: 1,
    name: "Monthly Report Template",
    description: "Professional monthly report with charts and analysis",
    category: "Reports",
    tags: ["business", "analytics", "monthly"],
    createdAt: "2024-12-01",
    thumbnail: "https://th.bing.com/th/id/OIP.2z7zLAj1ZLdJVsiSUxqnlAHaFu?w=286&h=180&c=7&r=0&o=7&dpr=2.8&pid=1.7&rm=3",
    downloads: 1250
  },
  {
    id: 2,
    name: "Invoice Template",
    description: "Clean and modern invoice template for businesses",
    category: "Finance",
    tags: ["invoice", "billing", "payment"],
    createdAt: "2024-11-28",
    thumbnail: "https://tse2.mm.bing.net/th/id/OIP.ALLqT1a9iLZLFjBKcKVsYAHaJl?rs=1&pid=ImgDetMain&o=7&rm=3",
    downloads: 3420
  },
  {
    id: 3,
    name: "Project Proposal",
    description: "Comprehensive project proposal template",
    category: "Business",
    tags: ["proposal", "project", "planning"],
    createdAt: "2024-11-25",
    thumbnail: "https://templatelab.com/wp-content/uploads/2017/02/project-proposal-template-11.jpg",
    downloads: 890
  },
  {
    id: 4,
    name: "Marketing Dashboard",
    description: "Track your marketing metrics in one place",
    category: "Marketing",
    tags: ["dashboard", "analytics", "metrics"],
    createdAt: "2024-12-05",
    thumbnail: "https://th.bing.com/th/id/OIP.DEhlZ9uc7CXIruO5FdRIhwHaGN?w=89&h=90&c=1&rs=1&qlt=70&r=0&o=7&dpr=2.8&pid=InlineBlock&rm=3",
    downloads: 2100
  },
  {
    id: 5,
    name: "Meeting Minutes",
    description: "Simple template for recording meeting notes",
    category: "Productivity",
    tags: ["meeting", "notes", "productivity"],
    createdAt: "2024-11-20",
    thumbnail: "https://via.placeholder.com/400x250/8B5CF6/ffffff?text=Meeting",
    downloads: 1560
  },
  {
    id: 6,
    name: "Sales Presentation",
    description: "Impressive sales pitch presentation template",
    category: "Sales",
    tags: ["presentation", "sales", "pitch"],
    createdAt: "2024-12-03",
    thumbnail: "https://tse4.mm.bing.net/th/id/OIP.gb1SgXw305WUpIXSa0D9OAHaHA?rs=1&pid=ImgDetMain&o=7&rm=3",
    downloads: 980
  }
];

const categories = ["All", "Reports", "Finance", "Business", "Marketing", "Productivity", "Sales"];
const sortOptions = [
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Most Popular" },
  { value: "name", label: "Name (A-Z)" }
];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = mockTemplates;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((template) => template.category === selectedCategory);
    }

    // Sort templates
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.downloads - a.downloads;
        case "name":
          return a.name.localeCompare(b.name);
        case "latest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [searchQuery, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
              <p className="text-gray-600 mt-1">
                {filteredTemplates.length} templates available
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${
                  viewMode === "grid"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${
                  viewMode === "list"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter size={20} />
              <span>Filters</span>
            </button>
          </div>

          {/* Category Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Templates Grid/List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search size={64} className="mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No templates found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
              >
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700">
                    {template.category}
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        <Tag size={12} />
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="font-medium">{template.downloads.toLocaleString()} downloads</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 cursor-pointer group"
              >
                <div className="flex gap-6">
                  <div className="w-48 h-32 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-xl text-gray-900 group-hover:text-blue-600 transition-colors">
                          {template.name}
                        </h3>
                        <span className="inline-block mt-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {template.category}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {template.downloads.toLocaleString()} downloads
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            <Tag size={12} />
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock size={16} />
                        <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}