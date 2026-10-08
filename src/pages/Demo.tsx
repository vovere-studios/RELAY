import { Routes, Route } from 'react-router-dom';
import { WorkspaceProvider } from '../data/Workspace';
import { Shell } from '../components/Shell';
import { Overview } from './Overview';
import { Suppliers } from './Suppliers';
import { SupplierDetail } from './SupplierDetail';
import { ActivityPage, Documents, NotFound, Organization, Products, Requests } from './WorkspacePages';
export function Demo(){return <WorkspaceProvider><Routes><Route element={<Shell/>}><Route index element={<Overview/>}/><Route path="suppliers" element={<Suppliers/>}/><Route path="suppliers/:id" element={<SupplierDetail/>}/><Route path="documents" element={<Documents/>}/><Route path="requests" element={<Requests/>}/><Route path="products" element={<Products/>}/><Route path="organization" element={<Organization/>}/><Route path="activity" element={<ActivityPage/>}/><Route path="*" element={<NotFound/>}/></Route></Routes></WorkspaceProvider>;}
