import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Image,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import { Camera, CheckCircle2, RefreshCcw, UserCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { enrollStudentFace, faceCheckIn, getStudents } from "../../services/studentService";
import { mediaUrl } from "../../utils/formatters";

function dataUrlToFile(dataUrl, filename) {
  const [meta, data] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data.slice(0, 180);
  if (data.detail) return data.detail;
  const firstValue = Object.values(data)[0];
  if (Array.isArray(firstValue)) return firstValue.join(" ");
  if (typeof firstValue === "string") return firstValue;
  return fallback;
}

export default function FaceAttendancePage() {
  const { businessId, business, plan } = useOutletContext();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState();
  const [loading, setLoading] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [snapshot, setSnapshot] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [faceHint, setFaceHint] = useState("");

  const isEdu = business?.business_type === "education_center";
  const hasEduAttendance = Boolean(plan?.has_edu_attendance);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId),
    [studentId, students],
  );

  const loadStudents = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const list = await getStudents({ business_id: businessId, status: "active" });
      setStudents(list);
      setStudentId((prev) => prev || list[0]?.id);
    } catch {
      message.error("O‘quvchilar yuklanmadi.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
    },
    [],
  );

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setFaceHint("");
    } catch {
      message.error("Kamera ochilmadi. Brauzerdan kamera ruxsatini bering.");
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      message.warning("Avval kamerani yoqing.");
      return "";
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
    setSnapshot(dataUrl);

    if ("FaceDetector" in window) {
      try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(canvas);
        setFaceHint(faces.length ? "Yuz ko‘rindi" : "Yuz aniq ko‘rinmadi, qayta urinib ko‘ring");
      } catch {
        setFaceHint("");
      }
    }

    return dataUrl;
  };

  const enrollFace = async () => {
    if (!selectedStudent) {
      message.warning("O‘quvchini tanlang.");
      return;
    }
    const shot = snapshot || (await capture());
    if (!shot) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("face_photo", dataUrlToFile(shot, `student-${selectedStudent.id}-face.jpg`));
      formData.append("face_consent", "true");
      await enrollStudentFace(selectedStudent.id, formData);
      message.success("Face rasm ro‘yxatdan o‘tdi.");
      setSnapshot("");
      await loadStudents();
    } catch (e) {
      message.error(apiErrorMessage(e, "Face rasm saqlanmadi."));
    } finally {
      setSaving(false);
    }
  };

  const markAttendance = async () => {
    if (!selectedStudent) {
      message.warning("O‘quvchini tanlang.");
      return;
    }
    if (!selectedStudent.face_photo) {
      message.warning("Avval shu o‘quvchining face rasmini ro‘yxatdan o‘tkazing.");
      return;
    }

    await capture();
    setSaving(true);
    try {
      const res = await faceCheckIn({ business_id: businessId, student_id: selectedStudent.id });
      setLastCheckIn(res);
      message.success(`${res.student.name} uchun bugungi davomat belgilandi.`);
    } catch (e) {
      message.error(apiErrorMessage(e, "Davomat belgilanmadi."));
    } finally {
      setSaving(false);
    }
  };

  if (!businessId) return null;
  if (loading) return <LoadingScreen />;

  if (!isEdu || !hasEduAttendance) {
    return (
      <>
        <PageHeader title="Face davomat" description="Kompyuter kamerasi orqali o‘quvchi kelganini belgilash." />
        <Alert
          type="warning"
          showIcon
          message="Bu modul faqat o‘quv markaz davomat tarifi yoqilgan bizneslarda ishlaydi."
        />
      </>
    );
  }

  const studentOptions = students.map((student) => ({
    value: student.id,
    label: `${student.name}${student.group_name ? ` · ${student.group_name}` : ""}`,
  }));

  return (
    <>
      <PageHeader
        title="Face davomat"
        description="Webcam orqali face rasmni ro‘yxatdan o‘tkazing va kelgan o‘quvchini davomatga belgilang."
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="MVP rejim"
        description="Hozirgi versiyada o‘quvchi tanlanadi, kamera rasmi bilan davomat belgilanadi. Avtomatik yuz solishtirish keyingi bosqichda kuchli face recognition servisi bilan ulanadi."
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card
            title="Kamera"
            extra={
              <Space wrap>
                <Button icon={<Camera size={16} />} onClick={startCamera}>
                  Kamerani yoqish
                </Button>
                <Button icon={<RefreshCcw size={16} />} onClick={capture} disabled={!cameraOn}>
                  Rasm olish
                </Button>
              </Space>
            }
          >
            <div className="cs-face-camera">
              <video ref={videoRef} className="cs-face-camera__video" playsInline muted />
              {!cameraOn ? (
                <div className="cs-face-camera__empty">
                  <Camera size={42} />
                  <Typography.Text>Kamerani yoqish tugmasini bosing</Typography.Text>
                </div>
              ) : null}
            </div>
            {faceHint ? (
              <Tag color={faceHint === "Yuz ko‘rindi" ? "green" : "orange"} style={{ marginTop: 12 }}>
                {faceHint}
              </Tag>
            ) : null}
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Card title="O‘quvchi">
              {!students.length ? (
                <Empty description="Faol o‘quvchi yo‘q" />
              ) : (
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    value={studentId}
                    options={studentOptions}
                    onChange={setStudentId}
                  />
                  {selectedStudent ? (
                    <div className="cs-face-student">
                      {selectedStudent.face_photo ? (
                        <Image src={mediaUrl(selectedStudent.face_photo)} width={86} height={86} className="cs-face-student__photo" />
                      ) : (
                        <div className="cs-face-student__placeholder">Face yo‘q</div>
                      )}
                      <div>
                        <Typography.Text strong>{selectedStudent.name}</Typography.Text>
                        <div className="cs-face-student__meta">{selectedStudent.group_name || "Guruhsiz"}</div>
                        <Link to={`/business/students/${selectedStudent.id}`}>Profilni ochish</Link>
                      </div>
                    </div>
                  ) : null}
                </Space>
              )}
            </Card>

            <Card title="Amallar">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Button block onClick={enrollFace} loading={saving} disabled={!cameraOn || !selectedStudent}>
                  Face rasmni ro‘yxatdan o‘tkazish
                </Button>
                <Button
                  block
                  type="primary"
                  icon={<UserCheck size={16} />}
                  onClick={markAttendance}
                  loading={saving}
                  disabled={!cameraOn || !selectedStudent}
                >
                  Kelgan deb belgilash
                </Button>
              </Space>
            </Card>

            {lastCheckIn ? (
              <Card>
                <Statistic
                  title="Oxirgi belgilangan"
                  value={lastCheckIn.student.name}
                  prefix={<CheckCircle2 size={18} color="#059669" />}
                />
                <Typography.Text type="secondary">{lastCheckIn.date}</Typography.Text>
              </Card>
            ) : null}
          </Space>
        </Col>
      </Row>
    </>
  );
}
