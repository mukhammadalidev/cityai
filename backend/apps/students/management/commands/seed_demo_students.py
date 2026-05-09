from django.core.management.base import BaseCommand

from apps.businesses.models import Business
from apps.catalog.models import Item
from apps.students.demo_data import DEMO_STUDENTS
from apps.students.models import Student, StudentGroup
from apps.teachers.models import Teacher


class Command(BaseCommand):
    help = "Birinchi faol o‘quv markaziga 10 ta demo o‘quvchi qo‘shadi (telefon bo‘yicha takrorlanmaydi)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--business-id",
            type=int,
            default=None,
            help="Muayyan o‘quv markaz ID (ko‘rsatilmasa, birinchi faol markaz).",
        )

    def handle(self, *args, **options):
        bid = options.get("business_id")
        if bid:
            biz = Business.objects.filter(
                id=bid,
                business_type=Business.BusinessType.EDUCATION_CENTER,
            ).first()
        else:
            biz = (
                Business.objects.filter(
                    business_type=Business.BusinessType.EDUCATION_CENTER,
                    status=Business.Status.ACTIVE,
                )
                .order_by("id")
                .first()
            )
        if not biz:
            self.stdout.write(self.style.ERROR("Faol o‘quv markaz topilmadi."))
            return

        edu_items = list(Item.objects.filter(business=biz, status=Item.Status.ACTIVE))
        demo_teachers = [
            ("Malika Aliyeva", "+998901200001", "Ingliz tili, IELTS"),
            ("Jamshid Karimov", "+998901200002", "Matematika, fizika"),
            ("Aziza Tursunova", "+998901200003", "Grafik dizayn, IT"),
        ]
        tchs = []
        for ti, (tname, tph, subj) in enumerate(demo_teachers):
            t, _ = Teacher.objects.get_or_create(
                business=biz,
                full_name=tname,
                defaults={
                    "phone": tph,
                    "subjects": subj,
                    "bio": "Demo ustoz profili (seed_demo_students).",
                    "sort_order": ti,
                    "status": Teacher.Status.ACTIVE,
                },
            )
            tchs.append(t)

        demo_group_defs = [
            ("Guruh A — boshlang‘ich", 0),
            ("Guruh B — o‘rta", 1),
            ("Guruh C — yuqori", 2),
        ]
        grs = []
        for gname, order in demo_group_defs:
            link_course = edu_items[order % len(edu_items)] if edu_items else None
            lead = tchs[order % len(tchs)]
            g, _ = StudentGroup.objects.get_or_create(
                business=biz,
                name=gname,
                defaults={
                    "description": "Demo o‘quv guruhi (seed_demo_students).",
                    "sort_order": order,
                    "course": link_course,
                    "teacher": lead,
                },
            )
            if g.teacher_id != lead.id:
                g.teacher = lead
                g.save(update_fields=["teacher"])
            grs.append(g)

        created = 0
        for idx, (name, phone) in enumerate(DEMO_STUDENTS):
            course = edu_items[idx % len(edu_items)] if edu_items else None
            g_row = grs[idx % len(grs)]
            st, was_created = Student.objects.get_or_create(
                business=biz,
                phone=phone,
                defaults={
                    "name": name,
                    "course": course,
                    "group": g_row,
                    "status": Student.Status.ACTIVE,
                    "notes": "Demo o‘quvchi (seed_demo_students).",
                },
            )
            if was_created:
                created += 1
            elif st.group_id != g_row.id or (course and st.course_id != course.id):
                st.group = g_row
                if course:
                    st.course = course
                st.save(update_fields=["group", "course"])

        self.stdout.write(
            self.style.SUCCESS(
                f"O‘quv markaz: {biz.name} (id={biz.id}). Yangi o‘quvchilar: {created}; "
                f"guruhlar: {len(grs)}; ustozlar: {len(tchs)}; demo telefonlar: {len(DEMO_STUDENTS)}."
            )
        )
