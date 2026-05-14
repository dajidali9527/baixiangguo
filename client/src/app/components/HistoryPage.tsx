import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Search, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchHistoryData } from '../../api/history';

const PAGE_SIZE = 15;

function Pagination({ currentPage, totalPages, onPageChange, total }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total: number;
}) {
  const pageNumbers: number[] = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>上一页</Button>
      {startPage > 1 && (
        <>
          <Button variant={currentPage === 1 ? 'default' : 'ghost'} size="sm" onClick={() => onPageChange(1)}>1</Button>
          {startPage > 2 && <span className="px-2">...</span>}
        </>
      )}
      {pageNumbers.map((page) => (
        <Button key={page} variant={currentPage === page ? 'default' : 'ghost'} size="sm" onClick={() => onPageChange(page)}>{page}</Button>
      ))}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2">...</span>}
          <Button variant={currentPage === totalPages ? 'default' : 'ghost'} size="sm" onClick={() => onPageChange(totalPages)}>{totalPages}</Button>
        </>
      )}
      <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>下一页</Button>
      {total > 0 && (
        <div className="text-sm text-gray-500 ml-4">
          显示 {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, total)} 条，共 {total} 条
        </div>
      )}
    </div>
  );
}

export function HistoryPage() {
  const [activeSource, setActiveSource] = useState('bxx');
  const [searchText, setSearchText] = useState('');
  const [filterText, setFilterText] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const doSearch = () => {
    setSearchKeyword(searchText);
    setFilterDate(filterText);
    setCurrentPage(1);
  };

  const doReset = () => {
    setSearchText('');
    setFilterText('');
    setSearchKeyword('');
    setFilterDate('');
    setCurrentPage(1);
  };

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const res: any = await fetchHistoryData({
          source: activeSource,
          keyword: searchKeyword,
          date: filterDate,
          page: currentPage,
          pageSize: PAGE_SIZE
        });
        if (!cancelled && res.code === 200 && res.data) {
          setRecords(res.data.list || []);
          setTotal(res.data.total || 0);
        }
      } catch (err) {
        if (!cancelled) console.error('加载历史数据失败:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [activeSource, searchKeyword, filterDate, currentPage]);

  const handleSourceChange = (source: string) => {
    setActiveSource(source);
    setSearchText('');
    setFilterText('');
    setSearchKeyword('');
    setFilterDate('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(Math.max(total, 0) / PAGE_SIZE);

  return (
    <div className="p-8">
      <Tabs defaultValue="bxx" className="w-full" onValueChange={handleSourceChange}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="bxx">百香果信息平台</TabsTrigger>
          <TabsTrigger value="huinong">惠农网黄金百香果</TabsTrigger>
          <TabsTrigger value="xinfadi">北京新发地</TabsTrigger>
          <TabsTrigger value="jiangnan">广州江南</TabsTrigger>
        </TabsList>

        <TabsContent value={activeSource} className="mt-0">
          <Card className="p-6 mb-6">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label className="text-sm mb-2 block">关键词搜索</Label>
                <Input
                  placeholder={activeSource === 'bxx' ? '搜索地区、价类、规格等' : '搜索关键词'}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
                />
              </div>
              <div className="w-56">
                <Label className="text-sm mb-2 block">日期筛选</Label>
                <Input
                  type="date"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
              </div>
              <Button onClick={doSearch}>
                <Search className="w-4 h-4 mr-2" />
                搜索
              </Button>
              <Button variant="outline" onClick={doReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                重置
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            {loading ? (
              <p className="text-gray-500 text-center py-8">加载中...</p>
            ) : records.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无数据，请先执行数据采集</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  {activeSource === 'bxx' && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>省</TableHead>
                          <TableHead>地区</TableHead>
                          <TableHead>市斤价</TableHead>
                          <TableHead>价类</TableHead>
                          <TableHead>规格</TableHead>
                          <TableHead>备注</TableHead>
                          <TableHead>报价日期</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.province}</TableCell>
                            <TableCell>{item.region}</TableCell>
                            <TableCell>{Number(item.avgPrice).toFixed(1)}</TableCell>
                            <TableCell>{item.priceType}</TableCell>
                            <TableCell>{item.spec}</TableCell>
                            <TableCell>{item.remark}</TableCell>
                            <TableCell>{item.date}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {activeSource === 'huinong' && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>时间</TableHead>
                          <TableHead>产品/品种</TableHead>
                          <TableHead>所在产地</TableHead>
                          <TableHead>价格（元/斤）</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>{item.product}</TableCell>
                            <TableCell>{item.origin}</TableCell>
                            <TableCell>{Number(item.avgPrice).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {activeSource === 'xinfadi' && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>一级分类</TableHead>
                          <TableHead>二级分类</TableHead>
                          <TableHead>品名</TableHead>
                          <TableHead>最低价</TableHead>
                          <TableHead>平均价</TableHead>
                          <TableHead>最高价</TableHead>
                          <TableHead>规格</TableHead>
                          <TableHead>产地</TableHead>
                          <TableHead>单位</TableHead>
                          <TableHead>发布日期</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.category1}</TableCell>
                            <TableCell>{item.category2}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.lowPrice}</TableCell>
                            <TableCell>{item.avgPrice}</TableCell>
                            <TableCell>{item.highPrice}</TableCell>
                            <TableCell>{item.spec}</TableCell>
                            <TableCell>{item.origin}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.date}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {activeSource === 'jiangnan' && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>产品名称</TableHead>
                          <TableHead>产地</TableHead>
                          <TableHead>最高价(元/公斤)</TableHead>
                          <TableHead>最低价(元/公斤)</TableHead>
                          <TableHead>参考价(元/公斤)</TableHead>
                          <TableHead>规格</TableHead>
                          <TableHead>日期</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.origin}</TableCell>
                            <TableCell>{Number(item.highPrice).toFixed(1)}</TableCell>
                            <TableCell>{Number(item.lowPrice).toFixed(1)}</TableCell>
                            <TableCell>{Number(item.avgPrice).toFixed(1)}</TableCell>
                            <TableCell>{item.spec}</TableCell>
                            <TableCell>{item.date}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                {totalPages > 1 && (
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} total={total} />
                )}
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}