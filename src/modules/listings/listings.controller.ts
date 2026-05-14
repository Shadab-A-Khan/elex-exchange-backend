import {
  Controller, Post, Get, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/listing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('listings')
export class ListingsController {
  constructor(private listingsService: ListingsService) {}

  /** GET /listings/variants?search=iphone&limit=20 — public, powers the post-form product search */
  @Get('variants')
  async searchVariants(
    @Query('search') search?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.listingsService.searchVariants(search, limit);
  }

  /** POST /listings — JWT required */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req: any, @Body() dto: CreateListingDto) {
    return this.listingsService.create(req.user.userId, req.user.role, dto);
  }

  /** GET /listings?intent=WTS&brand_id=uuid1,uuid2&category_id=uuid&stock_type=MASTER_CARTON&price_min=0&price_max=100000&search=iphone&limit=50&offset=0 — public */
  @Get()
  async findAll(
    @Query('intent') intent?: string,
    @Query('stock_type') stock_type?: string,
    @Query('price_min') price_min?: string,
    @Query('price_max') price_max?: string,
    @Query('search') search?: string,
    @Query('brand_id') brand_id?: string,
    @Query('category_id') category_id?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.listingsService.findAll(
      intent,
      stock_type,
      price_min ? Number(price_min) : undefined,
      price_max ? Number(price_max) : undefined,
      search,
      brand_id,
      category_id,
      limit,
      offset,
    );
  }

  /** GET /listings/:id — public */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }
}
