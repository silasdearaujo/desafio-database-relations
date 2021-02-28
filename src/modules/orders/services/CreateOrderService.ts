import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IProductData {
  product_id: string;
  quantity: number;
  price: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) throw new AppError('Customer not found');

    const foundProducts = await this.productsRepository.findAllById(products);

    // if (foundProducts.length !== products.length)
    //   throw new AppError('Products not found', 404);

    const productsForUpdateQuantity: IProduct[] = [];

    const orderProducts: IProductData[] = [];

    products.forEach(product => {
      const data = foundProducts.find(
        foundProduct => foundProduct.id === product.id,
      );

      if (!data) throw new AppError('Products not found', 400);

      if (product.quantity > data.quantity)
        throw new AppError(`Quantity not available for ${data.name}`, 400);

      productsForUpdateQuantity.push({
        id: product.id,
        quantity: data.quantity - product.quantity,
      });

      orderProducts.push({
        product_id: product.id,
        quantity: product.quantity,
        price: data.price,
      });
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(productsForUpdateQuantity);

    return order;
  }
}

export default CreateOrderService;
