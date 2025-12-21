import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './auth/AuthPage';
import Home from './pages/Home';

import AdminDashboard from './pages/admin/Dashboard';
import ManageUsers from './pages/admin/ManageUsers';
import AddUser from './pages/admin/AddUser';
import EditUser from './pages/admin/EditUser';
import ManageKegiatan from './pages/admin/ManageKegiatan';
import AddKegiatan from './pages/admin/AddKegiatan';
import EditKegiatan from './pages/admin/EditKegiatan';
import DetailUser from './pages/admin/DetailUser';
import DetailKegiatan from './pages/admin/DetailKegiatan';
import Penugasan from './pages/admin/Penugasan';
import DetailPenugasan from './pages/admin/DetailPenugasan';
import TambahPenugasan from './pages/admin/TambahPenugasan';
import ManajemenMitra from './pages/admin/ManajemenMitra';
import DetailMitra from './pages/admin/DetailMitra';
import TemplatePenugasan from './pages/admin/TemplatePenugasan';
import ManajemenJabatan from './pages/admin/ManajemenJabatan';
import AddMitra from './pages/admin/AddMitra';
import ManajemenSPK from './pages/admin/ManajemenSPK';
import CetakSPK from './pages/admin/CetakSPK';
import EditMitra from './pages/admin/EditMitra';
import EditPenugasan from './pages/admin/EditPenugasan';
import TransaksiMitra from './pages/admin/TransaksiMitra';
import BatasHonor from './pages/admin/BatasHonor';
import TambahTemplate from './pages/admin/TambahTemplate';
import PreviewTemplate from './pages/admin/PreviewTemplate';

import DetailKegiatanUser from './pages/DetailKegiatanUser';
import PenugasanUser from './pages/Penugasan';
import MitraUser from './pages/Mitra';
import TransaksiMitraUser from './pages/TransaksiMitraUser';
import DetailMitraUser from './pages/DetailMitraUser';
import TambahPenugasanUser from './pages/TambahPenugasan';
import DetailPenugasanUser from './pages/DetailPenugasan';
import EditPenugasanUser from './pages/EditPenugasan';
import ManajemenKegiatan from './pages/ManajemenKegiatan';
import ManajemenSPKUser from './pages/ManajemenSPK';
import CetakSPKUser from './pages/CetakSPKUser';
import TambahTemplateSPKUser from './pages/TambahTemplateSPKUser';
import PreviewTemplateSPKUser from './pages/PreviewTemplateSPKUser';

import Layout from './layouts/Layout';
import AdminLayout from './layouts/AdminLayout';

import RequireAuth from './components/RequireAuth';
import AutoLogout from './components/AutoLogout';
import Perencanaan from './pages/admin/Perencanaan';
import TambahPerencanaan from './pages/admin/TambahPerencanaan';
import EditPerencanaan from './pages/admin/EditPerencanaan';
import DetailPerencanaan from './pages/admin/DetailPerencanaan';
import RekapPerencanaan from './pages/admin/RekapPerencanaan';
import LengkapiProfile from './pages/LengkapiProfile';

import PerencanaanUser from './pages/Perencanaan';
import TambahPerencanaanUser from './pages/TambahPerencanaan';
import EditPerencanaanUser from './pages/EditPerencanaan';
import DetailPerencanaanUser from './pages/DetailPerencanaan';
import RekapPerencanaanUser from './pages/RekapPerencanaan';
import ManajemenSistem from './pages/admin/ManajemenSistem';

function AppRoutes() {
  return (
    <BrowserRouter>
      <AutoLogout />
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/register" element={<Navigate to="/" replace />} />

        <Route element={<RequireAuth allowedRoles={['user', 'admin']} />}>
          <Route element={<Layout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/lengkapi-profil" element={<LengkapiProfile />} />
            <Route path="/kegiatan/:id" element={<DetailKegiatanUser />} />
            <Route path="/penugasan" element={<PenugasanUser />} />
            <Route path="/penugasan/detail/:id" element={<DetailPenugasanUser />} />
            <Route path="/daftar-mitra" element={<MitraUser />} />
            <Route path="/transaksi-mitra" element={<TransaksiMitraUser />} />
            <Route path="/transaksi-mitra/:id" element={<DetailMitraUser />} />
            <Route path="/penugasan/tambah" element={<TambahPenugasanUser />} />
            <Route path="/penugasan/:id" element={<DetailPenugasanUser />} />
            <Route path="/penugasan/edit/:id" element={<EditPenugasanUser />} />
            <Route path="/daftar-kegiatan" element={<ManajemenKegiatan />} />
            <Route path="/spk" element={<ManajemenSPKUser />} />
            <Route path="/spk/templates/create" element={<TambahTemplateSPKUser />} />
            <Route path="/spk/templates/edit/:id" element={<TambahTemplateSPKUser />} />
            <Route path="/perencanaan" element={<PerencanaanUser />} />
            <Route path="/perencanaan/tambah" element={<TambahPerencanaanUser />} />
            <Route path="/perencanaan/detail/:id" element={<DetailPerencanaanUser />} />
            <Route path="/perencanaan/edit/:id" element={<EditPerencanaanUser />} />
            <Route path="/rekap" element={<RekapPerencanaanUser />} />
          </Route>
          <Route path="/spk/print/:periode/:id_mitra" element={<CetakSPKUser />} />
          <Route path="/spk/templates/preview" element={<PreviewTemplateSPKUser />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={['admin']} />}>
          <Route path="/admin/spk/print/:periode/:id_mitra" element={<CetakSPK />} />
          <Route path="/admin/spk/templates/preview" element={<PreviewTemplate />} />

          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/manage-users" element={<ManageUsers />} />
            <Route path="/admin/users/add" element={<AddUser />} />
            <Route path="/admin/edit-user/:id" element={<EditUser />} />
            <Route path="/admin/users/:id/detail" element={<DetailUser />} />
            <Route path="/admin/manage-kegiatan" element={<ManageKegiatan />} />
            <Route path="/admin/manage-kegiatan/tambah" element={<AddKegiatan />} />
            <Route path="/admin/manage-kegiatan/edit/:id" element={<EditKegiatan />} />
            <Route path="/admin/manage-kegiatan/detail/:id" element={<DetailKegiatan />} />
            <Route path="/admin/penugasan/preview" element={<TemplatePenugasan />} />
            <Route path="/admin/mitra/tambah" element={<AddMitra />} />

            <Route path="/admin/penugasan" element={<Penugasan />} />
            <Route path="/admin/penugasan/tambah" element={<TambahPenugasan />} />
            <Route path="/admin/penugasan/detail/:id" element={<DetailPenugasan />} />
            <Route path="/admin/penugasan/edit/:id" element={<EditPenugasan />} />

            <Route path="/admin/perencanaan" element={<Perencanaan />} />
            <Route path="/admin/perencanaan/tambah" element={<TambahPerencanaan />} />
            <Route path="/admin/perencanaan/detail/:id" element={<DetailPerencanaan />} />
            <Route path="/admin/perencanaan/edit/:id" element={<EditPerencanaan />} />
            <Route path="/admin/rekap" element={<RekapPerencanaan />} />

            <Route path="/admin/manajemen-mitra" element={<ManajemenMitra />} />
            <Route path="/admin/mitra/:id" element={<DetailMitra />} />
            <Route path="/admin/manajemen-jabatan" element={<ManajemenJabatan />} />
            <Route path="/admin/manajemen-spk" element={<ManajemenSPK />} />
            <Route path="/admin/mitra/edit/:id" element={<EditMitra />} />
            <Route path="/admin/transaksi-mitra" element={<TransaksiMitra />} />
            <Route path="/admin/batas-honor" element={<BatasHonor />} />
            <Route path="/admin/spk/templates/create" element={<TambahTemplate />} />
            <Route path="/admin/spk/templates/edit/:id" element={<TambahTemplate />} />

            <Route path="/admin/system-settings" element={<ManajemenSistem />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;