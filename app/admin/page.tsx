"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Brain, Trash2, Users, BarChart3, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
}

interface Quiz {
  id: string
  title: string
  description: string
  tags: string[]
  questions: Question[]
  createdAt: string
  attempts: number
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [newQuiz, setNewQuiz] = useState({
    title: "",
    description: "",
    tags: "",
    questions: [] as Question[],
  })
  const [aiForm, setAiForm] = useState({
    topic: "",
    numQuestions: 5,
    difficulty: "medium",
  })
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("currentUser")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== "admin") {
      router.push("/dashboard")
      return
    }

    setUser(parsedUser)
    loadQuizzes()
  }, [router])

  const loadQuizzes = () => {
    const savedQuizzes = localStorage.getItem("quizzes")
    if (savedQuizzes) {
      setQuizzes(JSON.parse(savedQuizzes))
    }
  }

  const saveQuizzes = (updatedQuizzes: Quiz[]) => {
    localStorage.setItem("quizzes", JSON.stringify(updatedQuizzes))
    setQuizzes(updatedQuizzes)
  }

  const handleLogout = () => {
    localStorage.removeItem("currentUser")
    router.push("/")
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
    }
    setNewQuiz((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }))
  }

  const updateQuestion = (questionId: string, field: string, value: any) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === questionId ? { ...q, [field]: value } : q)),
    }))
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, options: q.options.map((opt, idx) => (idx === optionIndex ? value : opt)) } : q,
      ),
    }))
  }

  const removeQuestion = (questionId: string) => {
    setNewQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }))
  }

  const generateAIQuiz = async () => {
    setIsGenerating(true)
    try {
      const prompt = `Generate ${aiForm.numQuestions} multiple choice questions about "${aiForm.topic}" with ${aiForm.difficulty} difficulty. 
      Format the response as a JSON array where each question has:
      - question: string
      - options: array of 4 strings
      - correctAnswer: number (0-3 index)
      
      Make sure questions are educational and well-structured.`

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: prompt,
      })

      // Parse the AI response
      const questionsData = JSON.parse(text)
      const aiQuestions: Question[] = questionsData.map((q: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }))

      setNewQuiz((prev) => ({
        ...prev,
        title: `AI Generated: ${aiForm.topic}`,
        description: `Auto-generated ${aiForm.difficulty} level quiz about ${aiForm.topic}`,
        tags: aiForm.topic.toLowerCase(),
        questions: aiQuestions,
      }))

      setIsAIDialogOpen(false)
      setIsCreateDialogOpen(true)
    } catch (error) {
      console.error("Error generating AI quiz:", error)
      alert("Failed to generate quiz. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const saveQuiz = () => {
    if (!newQuiz.title || newQuiz.questions.length === 0) {
      alert("Please provide a title and at least one question")
      return
    }

    const quiz: Quiz = {
      id: Date.now().toString(),
      title: newQuiz.title,
      description: newQuiz.description,
      tags: newQuiz.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      questions: newQuiz.questions,
      createdAt: new Date().toISOString(),
      attempts: 0,
    }

    const updatedQuizzes = [...quizzes, quiz]
    saveQuizzes(updatedQuizzes)

    setNewQuiz({ title: "", description: "", tags: "", questions: [] })
    setIsCreateDialogOpen(false)
  }

  const deleteQuiz = (quizId: string) => {
    const updatedQuizzes = quizzes.filter((q) => q.id !== quizId)
    saveQuizzes(updatedQuizzes)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Brain className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizzes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizzes.reduce((acc, quiz) => acc + quiz.questions.length, 0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizzes.reduce((acc, quiz) => acc + quiz.attempts, 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Quiz</DialogTitle>
                <DialogDescription>Create a new quiz with custom questions and options</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Quiz Title</Label>
                    <Input
                      id="title"
                      value={newQuiz.title}
                      onChange={(e) => setNewQuiz((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter quiz title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={newQuiz.tags}
                      onChange={(e) => setNewQuiz((prev) => ({ ...prev, tags: e.target.value }))}
                      placeholder="e.g., science, biology, advanced"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newQuiz.description}
                    onChange={(e) => setNewQuiz((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter quiz description"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Questions</h3>
                    <Button onClick={addQuestion} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  {newQuiz.questions.map((question, qIndex) => (
                    <Card key={question.id} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Question {qIndex + 1}</Label>
                          <Button
                            onClick={() => removeQuestion(question.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <Textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(question.id, "question", e.target.value)}
                          placeholder="Enter your question"
                        />

                        <div className="grid md:grid-cols-2 gap-4">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correctAnswer === optIndex}
                                  onChange={() => updateQuestion(question.id, "correctAnswer", optIndex)}
                                />
                                <Label>Option {optIndex + 1} (Correct)</Label>
                              </div>
                              <Input
                                value={option}
                                onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                placeholder={`Option ${optIndex + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end space-x-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveQuiz} className="bg-blue-600 hover:bg-blue-700">
                    Save Quiz
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50 bg-transparent">
                <Brain className="h-4 w-4 mr-2" />
                AI Assist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI Quiz Generation</DialogTitle>
                <DialogDescription>Let AI help you create a quiz automatically</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic/Subject</Label>
                  <Input
                    id="topic"
                    value={aiForm.topic}
                    onChange={(e) => setAiForm((prev) => ({ ...prev, topic: e.target.value }))}
                    placeholder="e.g., World History, JavaScript, Biology"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numQuestions">Number of Questions</Label>
                  <Select
                    value={aiForm.numQuestions.toString()}
                    onValueChange={(value) => setAiForm((prev) => ({ ...prev, numQuestions: Number.parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Questions</SelectItem>
                      <SelectItem value="10">10 Questions</SelectItem>
                      <SelectItem value="15">15 Questions</SelectItem>
                      <SelectItem value="20">20 Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select
                    value={aiForm.difficulty}
                    onValueChange={(value) => setAiForm((prev) => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={generateAIQuiz}
                    disabled={isGenerating || !aiForm.topic}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isGenerating ? "Generating..." : "Generate Quiz"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quizzes List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Quizzes</h2>

          {quizzes.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No quizzes yet</h3>
                <p className="text-gray-600 mb-4">Create your first quiz to get started</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{quiz.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                      </div>
                      <Button
                        onClick={() => deleteQuiz(quiz.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {quiz.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{quiz.questions.length} questions</span>
                        <span>{quiz.attempts} attempts</span>
                      </div>

                      <div className="text-xs text-gray-500">
                        Created: {new Date(quiz.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
